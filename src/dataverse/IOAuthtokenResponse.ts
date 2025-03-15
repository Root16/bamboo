export interface OAuthTokenResponse {
	token_type: string;
	expires_in: number;
	ext_expires_in: number;
	access_token: string;
	expires_at: number; // Custom field to store expiration time
}