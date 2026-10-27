# littleboy용 릴리스 포인트

조직 저장소 `fluentt-ai-repo/pstack-orca`의 정식 Release를 게시하면 `littleboy-release` workflow가 해당 태그를 검사한다. 성공한 경우에만 `littleboy-release.json`을 그 Release에 첨부한다. draft와 prerelease는 운영 대상이 아니다.

표식의 schema는 1이며 `repository`, `release_id`, `tag`, `revision`(40자리 Git commit SHA)을 담는다. 같은 이름의 asset을 덮어쓰지 않는다. 태그를 이동하거나 표식을 수정해 이미 게시한 릴리스를 바꾸는 대신 새 태그와 Release를 만든다.

littleboy의 FluentT Ops가 매일 04:30 KST에 가장 최근 게시된 정식 Release를 확인한다. 긴급 업데이트는 기존 운영웹의 `pstack-orca 릴리스 업데이트`에서 수동 실행한다. 개발 작업이 끝날 때까지 같은 공통 큐에서 대기한다. CI는 littleboy로 접속하지 않으며 Tailscale 자격 증명도 받지 않는다.

첫 태그에는 이 workflow가 포함되어야 한다. 웹 UI나 사람의 GitHub CLI 인증으로 Release를 게시한다. 기본 `GITHUB_TOKEN`으로 게시한 Release는 다른 workflow를 시작하지 않는다.

운영 실행기·예약·복구의 정본은 `fluentt-ai-repo/fluentt-ops`의 `docs/operations.md`다. Release가 없는 현재 상태에서는 운영 실행이 버전을 바꾸지 않고 정상 종료한다.
