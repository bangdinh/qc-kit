# Toàn bộ lệnh của `jira.sh`

> Đặt `J` trước khi chạy — xem mục "Gọi script từ đâu" trong `SKILL.md`:
> ```bash
> J=/Users/bangs/02.Ftel/07.BE/b2b/01.webfirst/.claude/skills/jira/jira.sh
> ```

```bash
bash "$J" me                        # test token, in display name
bash "$J" whoami                    # email — dùng cho chữ ký description
bash "$J" key                       # rút Jira key từ nhánh git hiện tại
bash "$J" view      RPA-1234
bash "$J" comment   RPA-1234 "<text>"
bash "$J" summary   RPA-1234 "<title>"
bash "$J" describe  RPA-1234 "<description>"
bash "$J" point     RPA-1234 <giờ>
bash "$J" assign    RPA-1234 [<username>]        # không truyền user = gán chính mình
bash "$J" task      "<summary>" [PROJECT] ["<description>"]
bash "$J" story     "<summary>" [PROJECT] ["<description>"] [COMPONENT]
bash "$J" versions  [PROJECT]                        # tên version để truyền cho fixversion
bash "$J" fixversion RPA-1234 "Web 2.13.0"           # THAY THẾ fix version; --clear để gỡ
bash "$J" sprints   239                       # sprint active/future của board
bash "$J" sprint    377 RPA-1234              # đưa issue vào sprint
bash "$J" subtask   RPA-1234 "<summary>" ["<description>"]
bash "$J" worklog   RPA-1234 2h "<comment>"
bash "$J" transitions RPA-1234      # xem transition hợp lệ
bash "$J" transition  RPA-1234 "Bắt đầu task"
```

