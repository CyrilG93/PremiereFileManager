// Exercise the actual panel helpers without loading the CEP user interface.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../client/js/main.js'), 'utf8');
function helpers(fileSystem = fs) {
    const context = { require, Buffer, process, setTimeout: (callback) => callback(), fm_path: path, fm_fs: fileSystem, debugLog() {} };
    vm.createContext(context);
    const start = source.indexOf('// Only a move across volumes');
    const end = source.indexOf('// Move selected files into their Premiere-bin paths');
    vm.runInContext(source.slice(start, end), context);
    return context;
}

test('Windows retry moves Unicode paths after Node EBUSY and restores on relink failure', { skip: process.platform !== 'win32' }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-move-'));
    const currentPath = path.join(dir, "source ' $ ` % GEO \u200b.mp4");
    const targetPath = path.join(dir, 'destination', path.basename(currentPath));
    fs.writeFileSync(currentPath, 'media data');
    // Simulate the CEP Node failure while letting the real Windows API perform the move.
    const h = helpers({ ...fs, renameSync() { throw Object.assign(new Error('locked'), { code: 'EBUSY' }); } });
    const entry = await h.fm_tryNativeStructureMove({ currentPath, targetPath, name: 'media' });
    assert.equal(entry.success, true);
    assert.equal(entry.mode, 'native');
    assert.equal(fs.existsSync(currentPath), false);
    assert.equal(fs.readFileSync(targetPath, 'utf8'), 'media data');
    const restored = await h.fm_rollbackNativeStructureMoves([entry]);
    assert.equal(restored[0].success, true);
    assert.equal(fs.readFileSync(currentPath, 'utf8'), 'media data');
    fs.unlinkSync(currentPath);
    fs.rmdirSync(path.dirname(targetPath));
    fs.rmdirSync(dir);
});

// Model Premiere's item identities and online state while exercising the real host functions.
function hostReferences(currentPath, options = {}) {
    function media(nodeId, mediaPath) {
        return {
            nodeId, name: nodeId, mediaPath, offline: false,
            getMediaPath() { return this.mediaPath; },
            getProxyPath() { return ''; },
            isOffline() { return this.offline; },
            canChangeMediaPath() { return true; },
            setOffline() {
                if (options.releaseFails && nodeId === 'duplicate') { throw new Error('Release refused'); }
                this.offline = true;
            },
            changeMediaPath(target) {
                if (options.relinkFails && target !== currentPath) { throw new Error('Relink refused'); }
                this.mediaPath = target;
                this.offline = false;
            }
        };
    }
    const refs = [media('selected', currentPath), media('duplicate', currentPath), media('unrelated', 'unrelated')];
    const children = { 0: refs[0], 1: refs[1], 2: refs[2], numItems: 3 };
    const context = {
        app: { project: { rootItem: { children } } }, IS_WINDOWS: process.platform === 'win32',
        normalizeComparablePath: (p) => String(p || '').replace(/\\/g, '/').toLowerCase(),
        getBinPath: () => 'bin',
        FileManager_findStructureItem: (_root, id) => refs.find((ref) => ref.nodeId === id)
    };
    vm.createContext(context);
    const hostCode = fs.readFileSync(path.join(__dirname, '../host/index.jsx'), 'utf8');
    vm.runInContext(hostCode.slice(hostCode.indexOf('// Snapshot every online reference')), context);
    return { refs, context };
}

for (const scenario of ['success', 'Windows only', 'locked', 'release fails', 'relink fails']) {
    test(`Offline move: ${scenario}, duplicate references and recovery`, async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-release-'));
        const currentPath = path.join(dir, 'source.mp4');
        const targetPath = path.join(dir, 'target.mp4');
        fs.writeFileSync(currentPath, 'unchanged media');
        const host = hostReferences(currentPath, { releaseFails: scenario === 'release fails', relinkFails: scenario === 'relink fails' });
        const h = helpers({ ...fs, renameSync(src, dst) {
            // The simulated Premiere lock disappears only after both references are offline.
            if (scenario === 'locked' || scenario === 'Windows only' || host.refs.slice(0, 2).some((ref) => !ref.offline)) {
                throw Object.assign(new Error('busy'), { code: 'EBUSY' });
            }
            fs.renameSync(src, dst);
        } });
        h.fm_buildHostCall = (name, args) => ({ name, args });
        h.fm_evalScriptPromise = async ({ name, args }) => host.context[name](...args);
        if (scenario === 'locked') {
            h.fm_windowsStructureRename = async () => { throw Object.assign(new Error('Windows still busy'), { code: 'EBUSY' }); };
        }
        if (scenario === 'Windows only') {
            // The Windows retry must run before recovery reconnects either reference.
            h.fm_windowsStructureRename = async (src, dst) => {
                assert.equal(host.refs[0].offline, true);
                assert.equal(host.refs[1].offline, true);
                fs.renameSync(src, dst);
            };
        }
        const result = (await h.fm_moveReleasedStructureItems([{ currentPath, targetPath, name: 'selected', nodeId: 'selected' }]))[0];
        const succeeded = scenario === 'success' || scenario === 'Windows only';
        assert.equal(result.success, succeeded);
        assert.equal(result.fallbackCopy, undefined);
        assert.equal(fs.existsSync(currentPath), !succeeded);
        assert.equal(fs.existsSync(targetPath), succeeded);
        for (const ref of host.refs.slice(0, 2)) {
            assert.equal(ref.offline, false);
            assert.equal(ref.mediaPath, succeeded ? targetPath : currentPath);
        }
        assert.equal(host.refs[2].mediaPath, 'unrelated');
        fs.unlinkSync(succeeded ? targetPath : currentPath);
        fs.rmdirSync(dir);
    });
}

test('A confirmed Windows lock requests offline release instead of copying', { skip: process.platform !== 'win32' }, async () => {
    const h = helpers({ ...fs, existsSync: (p) => p.endsWith('source'), statSync: () => ({ isFile: () => true }), mkdirSync() {}, renameSync() { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); } });
    h.fm_windowsStructureRename = async () => { throw Object.assign(new Error('Windows busy'), { code: 'EBUSY' }); };
    const result = await h.fm_tryNativeStructureMove({ currentPath: 'source', targetPath: 'destination' });
    assert.equal(result.requiresRelease, true);
    assert.equal(result.fallbackCopy, undefined);
});

test('Missing reference snapshot cancels before taking any media offline', async () => {
    const h = helpers();
    h.fm_buildHostCall = (name) => name;
    const calls = [];
    h.fm_evalScriptPromise = async (name) => { calls.push(name); return '{}'; };
    const result = (await h.fm_moveReleasedStructureItems([{ currentPath: 'source', targetPath: 'destination' }]))[0];
    assert.equal(result.success, false);
    assert.deepEqual(calls, ['FileManager_getStructureReferences']);
});

test('Host rejects a silent changeMediaPath failure', () => {
    const { refs, context } = hostReferences('source');
    refs[0].changeMediaPath = () => {};
    const result = JSON.parse(context.FileManager_relinkStructureItems(JSON.stringify([{ nodeId: 'selected', currentPath: 'source', targetPath: 'target' }])));
    assert.equal(result.results[0].success, false);
});

// Check batch ordering and isolation using real file moves and a host recording every phase.
for (const scenario of ['success', 'one locked', 'one relink fails', 'partial release fails']) {
    test(`Grouped offline move: ${scenario}`, async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-batch-'));
        const items = [0, 1].map((index) => ({ nodeId: String(index), name: String(index), currentPath: path.join(dir, `source${index}`), targetPath: path.join(dir, `target${index}`) }));
        items.forEach((item) => fs.writeFileSync(item.currentPath, item.name));
        const offline = [false, false];
        const locations = items.map((item) => item.currentPath);
        const events = [];
        let waits = 0;
        const h = helpers({ ...fs, renameSync(src, dst) {
            const index = items.findIndex((item) => item.currentPath === src || item.targetPath === src);
            events.push(`move${index}`);
            if (src === items[index].currentPath) {
                assert.deepEqual(offline, [true, true]);
                if (scenario === 'one locked' && index === 1) { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); }
            }
            fs.renameSync(src, dst);
        } });
        h.setTimeout = (callback) => { waits++; callback(); };
        h.fm_windowsStructureRename = async () => { throw Object.assign(new Error('Windows busy'), { code: 'EBUSY' }); };
        h.fm_buildHostCall = (name, args) => ({ name, args });
        h.fm_evalScriptPromise = async ({ name, args }) => {
            const value = JSON.parse(args[0]);
            if (name === 'FileManager_getStructureReferences') {
                events.push(`snapshot${value.nodeId}`);
                return JSON.stringify({ references: [value] });
            }
            if (name === 'FileManager_setStructureReferencesOffline') {
                events.push(`offline:${value.length}`);
                for (const ref of value) {
                    offline[Number(ref.nodeId)] = true;
                    if (scenario === 'partial release fails') { return JSON.stringify({ error: 'Partial release failure' }); }
                }
                return '{"success":true}';
            }
            events.push(`relink:${value.length}`);
            return JSON.stringify({ results: value.map((ref) => {
                const index = Number(ref.nodeId);
                if (scenario === 'one relink fails' && index === 1 && ref.targetPath === items[1].targetPath) { return { success: false, error: 'Relink refused' }; }
                locations[index] = ref.targetPath;
                offline[index] = false;
                return { success: true };
            }) });
        };
        const results = await h.fm_moveReleasedStructureItems(items);
        const successful = scenario === 'partial release fails' ? [false, false] : [true, scenario === 'success'];
        assert.deepEqual(Array.from(results, (result) => result.success), successful);
        assert.deepEqual(events.slice(0, 3), ['snapshot0', 'snapshot1', 'offline:2']);
        assert.deepEqual(offline, [false, false]);
        if (scenario === 'success') {
            assert.deepEqual(events, ['snapshot0', 'snapshot1', 'offline:2', 'move0', 'move1', 'relink:2']);
            assert.equal(waits, 1);
        }
        if (scenario === 'one locked') { assert.equal(waits, 4); }
        for (let index = 0; index < items.length; index++) {
            const expectedPath = successful[index] ? items[index].targetPath : items[index].currentPath;
            assert.equal(locations[index], expectedPath);
            assert.equal(fs.readFileSync(expectedPath, 'utf8'), items[index].name);
            assert.equal(fs.existsSync(successful[index] ? items[index].currentPath : items[index].targetPath), false);
            fs.unlinkSync(expectedPath);
        }
        fs.rmdirSync(dir);
    });
}

test('Initial batch pass defers Windows retries until media release', { skip: process.platform !== 'win32' }, async () => {
    const h = helpers({ ...fs, existsSync: (p) => p.endsWith('source'), statSync: () => ({ isFile: () => true }), mkdirSync() {}, renameSync() { throw Object.assign(new Error('busy'), { code: 'EBUSY' }); } });
    h.fm_windowsStructureRename = async () => { assert.fail('Windows retry must be deferred'); };
    const result = await h.fm_tryNativeStructureMove({ currentPath: 'source', targetPath: 'destination' }, true);
    assert.equal(result.requiresRelease, true);
});

test('Duplicate source selections cancel before releasing shared references', async () => {
    const h = helpers();
    h.fm_structureHostRequest = async () => { assert.fail('Duplicate sources must not be released'); };
    const results = await h.fm_moveReleasedStructureItems([{ currentPath: 'source', targetPath: 'first' }, { currentPath: 'source', targetPath: 'second' }]);
    assert.deepEqual(Array.from(results, (result) => result.success), [false, false]);
});

test('Windows API never overwrites an existing destination', { skip: process.platform !== 'win32' }, async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-conflict-'));
    const src = path.join(dir, 'source');
    const dst = path.join(dir, 'destination');
    fs.writeFileSync(src, 'original');
    fs.writeFileSync(dst, 'existing');
    await assert.rejects(helpers().fm_windowsStructureRename(src, dst), { code: 'EEXIST' });
    assert.equal(fs.readFileSync(src, 'utf8'), 'original');
    assert.equal(fs.readFileSync(dst, 'utf8'), 'existing');
    fs.unlinkSync(src);
    fs.unlinkSync(dst);
    fs.rmdirSync(dir);
});

test('Cross-volume Node failures retain the existing copy fallback', async () => {
    const h = helpers({ ...fs, existsSync: (p) => p.endsWith('source'), statSync: () => ({ isFile: () => true }), mkdirSync() {}, renameSync() { throw Object.assign(new Error('different volume'), { code: 'EXDEV' }); } });
    const result = await h.fm_tryNativeStructureMove({ currentPath: 'source', targetPath: 'destination' });
    assert.equal(result.success, false);
    assert.equal(result.fallbackCopy, true);
});
