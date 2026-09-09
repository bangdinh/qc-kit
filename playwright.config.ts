import { defineEnvironments, definePlaywrightConfig } from './src/config';

/**
 * Config của chính kit — kit không có spec sản phẩm nào, chỉ có unit test của nó.
 *
 * Bảng môi trường ở đây tồn tại vì `definePlaywrightConfig()` cần một `env`; không test
 * nào của kit mở browser. Dự án tiêu thụ dùng bảng của họ (xem
 * `cmd/scaffold/templates/src/env.ts.tmpl`).
 *
 * Nghiệm thu end-to-end của kit không nằm ở đây mà ở `make smoke`: sinh một dự án thật,
 * cài từ tarball, rồi chạy.
 */
const env = defineEnvironments({
  none: {
    baseURL: 'http://localhost',
    timeouts: { action: 5_000, navigation: 10_000, expect: 5_000, test: 30_000 },
  },
}).resolve();

export default definePlaywrightConfig({
  env,
  projects: { unit: true, web: false, api: false, auth: false },
});
