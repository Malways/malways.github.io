# malways.github.io

개인 포트폴리오 사이트. 정적 HTML + CSS + 바닐라 JS, 외부 의존성 없음.

## 구조

```
index.html            메인 (Hero / About)
claude/index.html     /claude 서브페이지 (Claude 작업 기록)
404.html              404 페이지
assets/css/main.css   전체 스타일 (디자인 토큰 + 컴포넌트 + 반응형)
assets/js/main.js     인터랙션 (언어 전환, 스크롤 리빌, 패럴랙스, 메뉴)
assets/img/mark.svg   사이트 마크 (파비콘 + 히어로 + og:image)
assets/img/hero.svg   이전 히어로 아트워크 (현재 미사용)
assets/img/work-*.svg 프로젝트용 예비 아트워크 (현재 미사용)
.nojekyll             Jekyll 처리 비활성화
```

## 로컬 실행

```bash
python -m http.server 8000
# http://localhost:8000
```

## 배포 (GitHub Pages)

```bash
git init
git add .
git commit -m "feat: portfolio site"
git branch -M main
git remote add origin https://github.com/Malways/malways.github.io.git
git push -u origin main
```

저장소 Settings → Pages → Source를 `main` 브랜치 / `root`로 지정하면
`https://malways.github.io/` 와 `https://malways.github.io/claude/` 로 공개됩니다.

## 언어 전환 (KO / EN)

헤더의 `KO / EN` 버튼으로 전환합니다.

- 첫 방문 시 브라우저 언어를 감지해 한국어/영어를 고릅니다.
- 선택은 `localStorage`(`malways:lang`)에 저장되어 다음 방문에도 유지됩니다.
- 번역은 HTML 속성으로 붙입니다. 새 문구를 추가할 때 같은 규칙만 지키면 됩니다.

| 속성 | 용도 |
| --- | --- |
| `data-ko` / `data-en` | 요소의 텍스트 |
| `data-ko-html` / `data-en-html` | 링크 등 인라인 마크업이 포함된 텍스트 |
| `data-ko-ph` / `data-en-ph` | input·textarea의 placeholder |
| `data-ko-aria` / `data-en-aria` | `aria-label` |

```html
<h2 data-ko="소개" data-en="About">소개</h2>
```

`data-split`이 붙은 제목은 단어 단위로 쪼개져 등장 애니메이션이 적용되며,
`{중괄호}`로 감싼 단어는 밑줄 강조로 렌더링됩니다.

## 커스터마이징

| 항목 | 위치 |
| --- | --- |
| 색상 / 타이포 / 여백 | `assets/css/main.css` 상단 `:root` 변수 |
| 이름·소개 문구 | `index.html` 의 `.hero__title` (`data-ko` / `data-en` 함께 수정) |
| GitHub 링크 | `index.html` / `claude/index.html` 의 `.footer__cta` |
| 사이트 마크 | `assets/img/mark.svg` (파비콘·히어로·og:image가 모두 이 파일을 참조) |
| Claude 작업 기록 | `claude/index.html` 의 `.log` 내부 (HTML 주석에 항목 템플릿 있음) |

### 디자인 토큰

```css
--bg:    #ffffff;   /* 배경: 흰색 */
--fg:    #0d0d0d;   /* 본문: 검정 */
```

## 참고

- `prefers-reduced-motion` 사용자에게는 모든 애니메이션이 비활성화됩니다.
- 외부 링크는 푸터의 GitHub 하나뿐입니다.
