import * as mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { extname } from 'path';

const PDF_MIMETYPE = 'application/pdf';
const DOCX_MIMETYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function extract(buffer: Buffer, mimetype: string, originalName: string): Promise<string> {
  const ext = extname(originalName).toLowerCase();

  if (mimetype === PDF_MIMETYPE || ext === '.pdf') {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (mimetype === DOCX_MIMETYPE || ext === '.docx' || ext === '.doc') {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  return buffer.toString('utf-8');
}

/**
 * Never throws — a corrupted/unparseable file just yields no text, so the
 * upload still succeeds and ends up with 0 chunks instead of failing.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimetype: string,
  originalName: string,
): Promise<string> {
  try {
    return await extract(buffer, mimetype, originalName);
  } catch {
    return '';
  }
}
