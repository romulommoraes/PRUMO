const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_XML_BYTES = 24 * 1024 * 1024;
function u16(v, off) { return v.getUint16(off, true); }
function u32(v, off) { return v.getUint32(off, true); }
class ZipLocal {
    bytes;
    view;
    names = new Map();
    enc = new TextDecoder('utf-8');
    constructor(bytes) {
        this.bytes = bytes;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        let end = -1;
        for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
            if (u32(this.view, p) === 0x06054b50) {
                end = p;
                break;
            }
        }
        if (end < 0)
            throw new Error('Arquivo XLSX inválido: índice ZIP não encontrado.');
        const count = u16(this.view, end + 10);
        let pos = u32(this.view, end + 16);
        if (count > 500)
            throw new Error('Arquivo com número excessivo de componentes internos.');
        for (let i = 0; i < count; i++) {
            if (pos + 46 > bytes.length || u32(this.view, pos) !== 0x02014b50)
                throw new Error('Índice ZIP corrompido.');
            const method = u16(this.view, pos + 10), size = u32(this.view, pos + 20), uncompressed = u32(this.view, pos + 24);
            const len = u16(this.view, pos + 28), extra = u16(this.view, pos + 30), comment = u16(this.view, pos + 32);
            const name = this.enc.decode(bytes.subarray(pos + 46, pos + 46 + len));
            this.names.set(name.replace(/^\//, ''), { offset: u32(this.view, pos + 42), size, uncompressed, method });
            pos += 46 + len + extra + comment;
        }
    }
    async get(path) {
        const file = this.names.get(path.replace(/^\//, ''));
        if (!file)
            throw new Error(`Componente XLSX ausente: ${path}`);
        if (file.uncompressed > MAX_XML_BYTES)
            throw new Error('Aba muito grande para o importador local.');
        const p = file.offset;
        if (p + 30 > this.bytes.length || u32(this.view, p) !== 0x04034b50)
            throw new Error('ZIP com cabeçalho local inválido.');
        const start = p + 30 + u16(this.view, p + 26) + u16(this.view, p + 28);
        if (start + file.size > this.bytes.length)
            throw new Error('Dados ZIP incompletos.');
        const raw = this.bytes.slice(start, start + file.size);
        if (file.method === 0)
            return this.enc.decode(raw);
        if (file.method !== 8)
            throw new Error('Método de compressão XLSX não suportado.');
        if (typeof DecompressionStream === 'undefined')
            throw new Error('Este navegador não suporta descompressão XLSX local. Use uma versão atual do Chrome, Edge ou Firefox.');
        try {
            const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
            const reader = stream.getReader();
            const chunks = [];
            let total = 0;
            while (true) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                if (value) {
                    total += value.length;
                    if (total > MAX_XML_BYTES) {
                        await reader.cancel();
                        throw Error('XML descompactado maior que o limite permitido.');
                    }
                    chunks.push(value);
                }
            }
            const all = new Uint8Array(total);
            let at = 0;
            for (const c of chunks) {
                all.set(c, at);
                at += c.length;
            }
            return this.enc.decode(all);
        }
        catch (error) {
            throw new Error('Falha ao descompactar XLSX. ' + (error instanceof Error ? error.message : ''));
        }
    }
}
function xml(s) {
    if (/<!DOCTYPE|<!ENTITY/i.test(s))
        throw new Error('XML com entidades externas não permitido.');
    const d = new DOMParser().parseFromString(s, 'application/xml');
    if (d.getElementsByTagName('parsererror').length)
        throw new Error('XML do Excel inválido.');
    return d;
}
function children(el, name) { return [...el.children].filter(e => e.localName === name); }
function descendants(el, name) { return [...el.getElementsByTagName('*')].filter(e => e.localName === name); }
function joinText(el) { return descendants(el, 't').map(t => t.textContent ?? '').join(''); }
function colIndex(addr) { let n = 0; for (const c of addr.match(/^[A-Z]+/)?.[0] ?? '') {
    n = n * 26 + c.charCodeAt(0) - 64;
} return n - 1; }
function parseSheet(data, strings) {
    const rows = [];
    const body = descendants(data, 'sheetData')[0];
    if (!body)
        return rows;
    for (const r of children(body, 'row')) {
        const nr = Number(r.getAttribute('r') ?? (rows.length + 1));
        if (nr > 20000)
            throw new Error('Limite de 20 mil linhas por aba excedido.');
        const out = [];
        for (const c of children(r, 'c')) {
            const ref = c.getAttribute('r') ?? 'A1';
            const col = colIndex(ref);
            if (col < 0 || col > 100)
                continue;
            if (descendants(c, 'f').length) {
                out[col] = '__FORMULA__';
                continue;
            }
            const type = c.getAttribute('t');
            let val = null;
            if (type === 'inlineStr')
                val = joinText(c);
            else {
                const value = descendants(c, 'v')[0]?.textContent ?? null;
                if (value !== null) {
                    if (type === 's')
                        val = strings[Number(value)] ?? '';
                    else if (type === 'b')
                        val = value === '1';
                    else if (type === 'str' || type === 'e')
                        val = value;
                    else
                        val = Number.isFinite(Number(value)) ? Number(value) : value;
                }
            }
            out[col] = val;
        }
        rows[nr - 1] = out;
    }
    return Array.from({ length: rows.length }, (_, i) => rows[i] ?? []);
}
export async function readXlsxLocal(file) {
    if (!file.name.toLowerCase().endsWith('.xlsx'))
        throw Error('Selecione um arquivo .xlsx, não XLS ou CSV.');
    if (file.size > MAX_FILE_BYTES)
        throw Error('Limite de 15 MB para importação local.');
    const zip = new ZipLocal(new Uint8Array(await file.arrayBuffer()));
    const workbook = xml(await zip.get('xl/workbook.xml'));
    const rels = xml(await zip.get('xl/_rels/workbook.xml.rels'));
    const relMap = new Map();
    for (const r of descendants(rels, 'Relationship')) {
        const id = r.getAttribute('Id'), target = r.getAttribute('Target');
        if (id && target) {
            let p = target.replace(/^\//, '');
            if (!p.startsWith('xl/'))
                p = 'xl/' + p.replace(/^\.\//, '');
            if (p.includes('..'))
                throw Error('Referência interna XLSX inválida.');
            relMap.set(id, p);
        }
    }
    let strings = [];
    try {
        const s = xml(await zip.get('xl/sharedStrings.xml'));
        strings = descendants(s, 'si').map(joinText);
    }
    catch (e) {
        if (!(e instanceof Error) || !e.message.includes('Componente XLSX ausente'))
            throw e;
    }
    const out = [];
    for (const sh of descendants(workbook, 'sheet')) {
        const name = sh.getAttribute('name') ?? '';
        const id = sh.getAttribute('r:id') ?? sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
        const path = id ? relMap.get(id) : undefined;
        if (path && ['UNIDADES', 'SERVICOS'].includes(name.toUpperCase()))
            out.push({ sheet: name.toUpperCase(), data: parseSheet(xml(await zip.get(path)), strings) });
    }
    return out;
}
