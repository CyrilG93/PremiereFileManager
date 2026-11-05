// Exercise the actual panel helpers without loading the CEP user interface.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../client/js/main.js'), 'utf8');
function helpers(fileSystem = fs) {
    const context = { require, Buffer, process, fm_path: path, fm_fs: fileSystem, debugLog() {} };
    vm.createContext(context);
    const start = source.indexOf('// Windows may lock media opened');
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
