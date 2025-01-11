export interface UserInfo {
  title: string;
  thumbnails?: {
    default?: {
      url: string;
      width: number;
      height: number;
    };
    medium?: {
      url: string;
      width: number;
      height: number;
    };
  };
} 