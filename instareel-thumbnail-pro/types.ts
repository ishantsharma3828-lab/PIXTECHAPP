export interface Template {
  id: string;
  name: string;
}

export interface Frame {
  id: string;
  name: string;
}

export interface Font {
  id: string;
  name: string;
}

export interface SavedThumbnail {
  id: string;
  name: string;
  createdAt: number;
  previewImage: string;
  state: any;
}
