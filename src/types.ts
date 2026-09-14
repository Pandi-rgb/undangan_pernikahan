export interface Wish {
  id?: string;
  name: string;
  status: 'Hadir' | 'Tidak Hadir';
  message: string;
  createdAt: any;
}
