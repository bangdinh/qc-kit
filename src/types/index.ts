/**
 * Type dùng chung, không dính sản phẩm nào.
 *
 * Shape của API dưới test thuộc về dự án, đặt cạnh client của nó — không đặt ở đây.
 */

export interface Credentials {
  username: string;
  password: string;
}

/** Thứ mà một factory dựng được với vài field override. */
export type Overrides<T> = Partial<T>;
