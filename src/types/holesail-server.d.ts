declare module 'holesail-server' {
	type KeyPair = {
		privateKey: Buffer;
		publicKey: Buffer;
	};

	export default class HolesailServer {
		keyPair(buffSeed?: string): KeyPair;
		serve(port: number, address: string, callback?: () => void, buffSeed?: string): Promise<void>;
		destroy(): void;
		shutdown(): Promise<void>;
		getPublicKey(): string;
	}
}
