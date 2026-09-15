/**
 * Type dùng chung, không dính sản phẩm nào.
 *
 * Shape của API dưới test thuộc về dự án, đặt cạnh client của nó — không đặt ở đây.
 * `Credentials` cũng vậy: tài khoản có những field gì (username? mã doanh nghiệp? OTP?)
 * là câu hỏi của sản phẩm, nên nó sống cùng màn đăng nhập của dự án.
 */

/** Thứ mà một factory dựng được với vài field override. */
export type Overrides<T> = Partial<T>;
