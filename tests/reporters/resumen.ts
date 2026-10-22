import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { Readable } from 'node:stream';
import type { Reporter } from '@playwright/test/reporter';

const cargar = createRequire(path.join(process.cwd(), 'package.json'));
const { yazl, yauzl } = cargar('playwright-core/lib/utilsBundle') as {
  yazl: { ZipFile: new () => ZipDeSalida };
  yauzl: {
    fromBuffer: (
      buffer: Buffer,
      opciones: { lazyEntries: boolean },
      callback: (error: Error | null, zip: ZipDeEntrada) => void,
    ) => void;
  };
};

type ZipDeSalida = {
  addBuffer: (buffer: Buffer, nombre: string) => void;
  end: () => void;
  outputStream: Readable;
};

type EntradaZip = { fileName: string };

type ZipDeEntrada = {
  readEntry: () => void;
  openReadStream: (entrada: EntradaZip, callback: (error: Error | null, stream: Readable) => void) => void;
  on(evento: 'entry', listener: (entrada: EntradaZip) => void): void;
  on(evento: 'end', listener: () => void): void;
  on(evento: 'error', listener: (error: Error) => void): void;
};

type Archivo = {
  fileName: string;
  stats?: { total: number; expected: number };
};

const marca = '<template id="playwrightReportBase64">data:application/zip;base64,';

export default class ResumenPorArchivo implements Reporter {
  async onEnd(): Promise<void> {
    const indice = path.join(process.cwd(), 'playwright-report', 'index.html');
    if (!fs.existsSync(indice)) return;

    const html = fs.readFileSync(indice, 'utf8');
    const inicio = html.indexOf(marca);
    const fin = html.indexOf('</template>', inicio);
    if (inicio === -1 || fin === -1) return;

    const zip = Buffer.from(html.slice(inicio + marca.length, fin), 'base64');
    const entradas = await leerZip(zip);
    const reporte = entradas.get('report.json');
    if (!reporte) return;

    const datos = JSON.parse(reporte.toString('utf8')) as { files?: Archivo[] };
    for (const archivo of datos.files ?? []) {
      const total = archivo.stats?.total;
      const pasaron = archivo.stats?.expected;
      if (total === undefined || pasaron === undefined || /\s\d+\/\d+$/.test(archivo.fileName)) continue;
      archivo.fileName = `${archivo.fileName}  ${pasaron}/${total}`;
    }
    entradas.set('report.json', Buffer.from(JSON.stringify(datos)));

    const actualizado = await escribirZip(entradas);
    const nuevo = html.slice(0, inicio) + marca + actualizado.toString('base64') + html.slice(fin);
    fs.writeFileSync(indice, nuevo);
  }
}

function leerZip(buffer: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error) {
        reject(error);
        return;
      }
      const entradas = new Map<string, Buffer>();
      zip.on('entry', (entrada) => {
        zip.openReadStream(entrada, (errorDeLectura, stream) => {
          if (errorDeLectura) {
            reject(errorDeLectura);
            return;
          }
          const trozos: Buffer[] = [];
          stream.on('data', (trozo: Buffer) => trozos.push(trozo));
          stream.on('end', () => {
            entradas.set(entrada.fileName, Buffer.concat(trozos));
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => resolve(entradas));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

function escribirZip(entradas: Map<string, Buffer>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    const trozos: Buffer[] = [];
    zip.outputStream.on('data', (trozo: Buffer) => trozos.push(trozo));
    zip.outputStream.on('end', () => resolve(Buffer.concat(trozos)));
    zip.outputStream.on('error', reject);
    for (const [nombre, cuerpo] of entradas) zip.addBuffer(cuerpo, nombre);
    zip.end();
  });
}
