declare module "heic2any" {
    function heic2any(options: {
        blob: Blob | File;
        toType?: string;
        quality?: number;
        multiple?: boolean;
    }): Promise<Blob | Blob[]>;

    export default heic2any;
}
