declare module 'piexifjs' {
  interface PiexifObject {
    '0th'?: Record<string, unknown>;
    Exif?: Record<string, unknown>;
    GPS?: Record<string, unknown>;
    Interop?: Record<string, unknown>;
    '1st'?: Record<string, unknown>;
    thumbnail?: string;
  }

  namespace Piexif {
    const ImageIFD: Record<string, number>;
    const ExifIFD: Record<string, number>;
    const GPSIFD: Record<string, number>;
    function load(jpeg: string): PiexifObject;
    function dump(exifObj: PiexifObject): string;
    function insert(exifBytes: string, jpeg: string): string;
    function remove(jpeg: string): string;
  }

  export = Piexif;
}
