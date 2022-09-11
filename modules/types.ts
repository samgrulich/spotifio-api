export interface Credentials
{
  userID: string | undefined;
}

export interface TokenData
{
  accessToken: string;
  refreshToken: string;
  timeToLive: number;
  timeStamp: number;
}

export interface UserData
{
  id: string;
  email: string;
  country: string;
  explicit_content: {
    filter_enabled: boolean,
    filter_locked: boolean
  },
  images: [
    {
      url: string,
      height: number,
      width: number
    }
  ] 
  tokens: TokenData; 
}