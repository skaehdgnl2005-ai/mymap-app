# 자국 개인정보처리방침

**시행일자:** 2026-06-01 (Phase 10 launch target; 실제 시행일은 App Store /
Play Store 게시일에 맞춰 갱신)
**최종 개정일:** 2026-05-17

자국 (이하 "서비스")은 「개인정보 보호법」(이하 "개인정보보호법"), GDPR
(General Data Protection Regulation, EU 일반 개인정보 보호법) 및 관련
법령을 준수하며, 다음과 같은 개인정보처리방침을 운영합니다.

본 방침은 한국어를 기준으로 작성되었으며, 영문 번역본은 참고용입니다.
한국어 본문과 영문 번역본 간의 차이가 있을 경우 한국어 본문이 우선합니다.

---

## 1. 수집하는 개인정보 항목

서비스는 다음의 개인정보를 수집합니다.

### 1.1 회원가입 시 수집 (필수)

| 항목 | 출처 | 비고 |
|---|---|---|
| 이메일 주소 | Apple Sign In / Google Sign In / 이메일 회원가입 | 인증 및 계정 식별 |
| 식별자 (provider sub / user_id) | Apple / Google / Supabase Auth | 계정 식별, 데이터 격리 |
| 비밀번호 (해시값) | 이메일 회원가입 시에만 | 평문 미저장, bcrypt 해시만 보관 |

**Apple Private Email Relay**: Apple Sign In 사용 시 사용자가 "이메일
숨기기"를 선택한 경우, 실제 이메일이 아닌 Apple이 발급한 익명 릴레이
이메일이 수집됩니다.

### 1.2 서비스 이용 시 자동 수집 (선택적/필수)

| 항목 | 수집 시점 | 필수/선택 |
|---|---|---|
| 위치 정보 (위/경도, foreground only) | "내 위치" 버튼 탭 시에만 | 선택 (권한 거부 시 해당 기능만 비활성화) |
| 디바이스 OS 및 버전 | 앱 실행 시 자동 | 필수 (크래시 보고용) |
| 크래시 로그 (Sentry 통한 익명 수집) | 앱 충돌 시 | 필수 (안정성 개선) |
| IP 주소 | 모든 네트워크 요청 시 | 필수 (보안, 어뷰징 방지) |

### 1.3 사용자가 직접 입력/저장하는 콘텐츠

| 항목 | 비고 |
|---|---|
| 저장한 장소의 이름, 좌표, 카테고리 | 사용자가 명시적으로 저장한 데이터 |
| 메모 (최대 200자) | 사용자 임의 입력 |
| 색상 태그, 방문 여부 | 사용자 선택 |
| 원본 URL (Instagram / Naver / Threads 등) | 사용자가 공유 또는 붙여넣은 링크 |
| OG 메타데이터 캐시 (제목, 이미지 URL, 설명) | 원본 URL에서 자동 추출 |
| HOME / SCHOOL / WORK 앵커 좌표 | 사용자가 온보딩 또는 추후 설정 시 직접 등록 |

**위치 정보 저장 정책**: "내 위치" 버튼 탭으로 일시적으로 사용된 현재
위치는 카메라 이동에만 사용되며 **서버에 저장되지 않습니다**. 다만
사용자가 직접 저장한 장소(저장된 핀)의 좌표는 사용자 콘텐츠로 분류되어
저장됩니다.

---

## 2. 개인정보 수집 및 이용 목적

| 목적 | 사용되는 항목 | 법적 근거 |
|---|---|---|
| 회원 식별 및 인증 | 이메일, 식별자, 비밀번호 해시 | 계약 이행 (GDPR Art. 6(1)(b)) |
| 사용자별 데이터 격리 (RLS) | user_id | 계약 이행 |
| 저장한 장소의 동기화 및 표시 | 사용자 콘텐츠 전체 | 계약 이행 |
| 지도 카메라 이동 ("내 위치" 기능) | 위치 정보 (foreground only) | 명시적 동의 (GDPR Art. 6(1)(a)) |
| 서비스 안정성 모니터링 및 디버깅 | 크래시 로그, OS 버전 | 정당한 이익 (GDPR Art. 6(1)(f)) |
| 보안 및 어뷰징 방지 | IP 주소 (단기 보관) | 정당한 이익 |

서비스는 위 목적 외의 용도로 개인정보를 사용하지 않으며, 마케팅 목적의
이메일 발송, 광고 식별자 수집, 제3자 마케팅 데이터 판매를 일체 하지
않습니다.

---

## 3. 개인정보 보유 및 이용 기간

| 항목 | 보유 기간 |
|---|---|
| 회원 정보 (이메일, 식별자, 비밀번호 해시) | 회원 탈퇴 후 30일 내 영구 삭제 |
| 사용자 콘텐츠 (저장한 장소 등) | 회원 탈퇴 후 30일 내 영구 삭제 |
| 크래시 로그 (Sentry) | 수집일로부터 30일 |
| IP 주소 | 요청 처리 직후 폐기 (로그는 최대 90일) |
| 위치 정보 (일시적) | 카메라 이동 직후 폐기 (서버 미저장) |

회원 탈퇴 시 30일의 유예 기간을 두는 이유: 실수로 인한 탈퇴를 복구할
수 있도록 하기 위함입니다. 30일 경과 후에는 복구가 불가능하며, 모든
관련 데이터가 영구 삭제됩니다.

---

## 4. 개인정보의 제3자 제공 및 처리 위탁

서비스는 다음의 외부 서비스(처리 수탁자)를 통해 개인정보의 일부를
처리합니다. 모든 수탁자는 자체 개인정보처리방침을 운영하며, 서비스는
필요 최소한의 정보만을 전달합니다.

| 수탁자 | 위탁 업무 | 전달 정보 | 위치 |
|---|---|---|---|
| Supabase (Supabase Inc., US) | 인증, 데이터베이스, Edge Functions | 회원 정보, 사용자 콘텐츠 | 미국 (AWS ap-northeast-2 서울 리전) |
| Mapbox (Mapbox Inc., US) | 지도 타일 렌더링 | IP 주소, 지도 보기 영역 | 미국 |
| Naver (네이버주식회사, KR) | 장소 검색 (Local Search API) | 검색어 텍스트, IP 주소 | 대한민국 |
| Cloudflare (Cloudflare Inc., US) | 정적 자산 호스팅 (스프라이트, 폰트) | IP 주소 | 글로벌 CDN |
| Apple (Apple Inc., US) | Sign In with Apple 인증 | 인증 토큰 | 미국 |
| Google (Google LLC, US) | Google Sign In 인증 | 인증 토큰 | 미국 |
| Sentry (Functional Software Inc., US) | 크래시 보고 및 오류 추적 | 익명화된 크래시 로그, OS 정보 | 미국 |

각 수탁자에 전달되는 정보는 해당 서비스 제공에 필요한 최소한이며, 별도의
마케팅 또는 제3자 판매 목적으로 전달되지 않습니다.

**국외 이전 고지**: 위 수탁자 중 Apple, Google, Mapbox, Cloudflare,
Sentry, Supabase는 미국에 본사를 두고 있으며, 사용자 정보의 일부가
미국 또는 글로벌 인프라로 이전될 수 있습니다. 이는 서비스 제공을 위한
불가피한 처리이며, 각 수탁자는 GDPR 표준계약조항(SCC) 또는 동등한
보호 조치를 갖추고 있습니다.

---

## 5. 정보주체의 권리

사용자는 다음의 권리를 행사할 수 있습니다.

- **열람권** (Right to Access / 개인정보보호법 제35조 / GDPR Art. 15):
  자신의 개인정보 보유 현황을 확인할 수 있습니다.
- **정정·삭제권** (Right to Rectification / Erasure / 제36조 /
  GDPR Art. 16, 17): 잘못된 정보의 정정 또는 삭제를 요청할 수 있습니다.
- **처리정지권** (Right to Restriction / 제37조 / GDPR Art. 18):
  개인정보 처리의 일시적 중단을 요청할 수 있습니다.
- **이동권** (Right to Data Portability / GDPR Art. 20): 자신이 저장한
  콘텐츠를 JSON 또는 CSV 형식으로 내려받을 수 있습니다 (v1.5 이후 제공
  예정).
- **동의 철회권** (Right to Withdraw Consent / GDPR Art. 7(3)):
  앱 내 "회원 탈퇴" 메뉴를 통해 언제든 동의를 철회할 수 있습니다.
- **이의제기권** (Right to Object / GDPR Art. 21): 정당한 이익에
  기반한 처리에 대해 이의를 제기할 수 있습니다.

권리 행사는 본 방침 제9조에 명시된 연락처로 요청해 주시기 바랍니다.
서비스는 요청 접수 후 30일 이내에 처리 결과를 통지합니다.

---

## 6. 개인정보의 파기

회원 탈퇴, 계약 종료, 보유 기간 경과 시 다음 절차에 따라 개인정보를
파기합니다.

- **파기 절차**: 사용자가 앱 내 "회원 탈퇴" 또는 본 방침 연락처로 탈퇴
  요청 → 30일 유예 기간 → 자동 영구 삭제
- **파기 방법**: 데이터베이스에서 SQL `DELETE`로 영구 제거. 백업본의
  경우 다음 백업 주기 시 자동 만료. Sentry 등 외부 서비스의 보유분은
  각 수탁자의 보유 정책에 따라 자동 만료.

---

## 7. 개인정보 안전성 확보 조치

- **암호화 통신**: 모든 클라이언트-서버 통신은 TLS 1.2 이상으로 암호화
- **저장 시 암호화**: 비밀번호는 bcrypt 해시로만 저장 (평문 미저장).
  데이터베이스는 디스크 수준의 암호화 적용 (Supabase / AWS)
- **접근 통제**: Row Level Security (RLS)를 통한 사용자별 데이터 격리.
  사용자 A가 사용자 B의 데이터를 조회/수정/삭제할 수 있는 경로가 데이터
  베이스 수준에서 차단됨
- **취약점 대응**: 의존성 패키지의 보안 업데이트 모니터링. 중대한 취약점
  발견 시 72시간 이내 패치 배포 또는 임시 조치
- **개인정보 침해 대응**: 침해 사고 발생 시 GDPR 기준 72시간 이내 관할
  감독기관(개인정보보호위원회 / EU 회원국 DPA) 통지

---

## 8. 자동화된 의사결정 및 프로파일링

서비스는 사용자의 개인정보에 기반한 자동화된 의사결정 또는 프로파일링을
수행하지 않습니다.

---

## 9. 개인정보 보호책임자 및 연락처

| 구분 | 내용 |
|---|---|
| 개인정보 보호책임자 | (개인사업자 미등록; 운영자 직접 처리) |
| 연락처 | **[수정 필요: 운영자 이메일]** |
| 신고 및 문의 | 위 이메일로 접수. 영업일 기준 7일 이내 회신 |

> **TODO (Phase 10 user-driven decision):** Email address for DPO contact.
> Memory shows `2026gachi@gmail.com` as the user's email but a dedicated
> address (e.g. `privacy@jaguk.io` or `2026gachi+jaguk@gmail.com`) is
> better for spam filtering + clean separation. Lock this before App
> Store submission.

### 신고 기관

본 방침에 대한 이의가 있거나 권리 침해에 대해 신고하고자 하는 경우 다음
기관에 신고할 수 있습니다.

- **개인정보보호위원회 (PIPC)**: privacy.go.kr / 국번없이 182
- **개인정보 분쟁조정위원회**: kopico.go.kr / 1833-6972
- **대검찰청 사이버수사과**: spo.go.kr / 국번없이 1301
- **경찰청 사이버안전국**: cyberbureau.police.go.kr / 국번없이 182
- **EU 거주자**: 각 회원국의 DPA (Data Protection Authority)

---

## 10. 개인정보처리방침의 변경

본 방침은 법령, 정책, 서비스 변경 등에 따라 변경될 수 있으며, 중요한
변경 사항은 앱 공지 또는 이메일로 사전 안내합니다. 변경 후 서비스를 계속
이용하는 것은 변경된 방침에 대한 동의로 간주됩니다.

| 시행일자 | 주요 내용 |
|---|---|
| 2026-06-01 | 최초 제정 (v1.0 launch) |

---

# Privacy Policy (English translation — reference only; Korean version controls)

**Effective Date:** 2026-06-01 (Phase 10 launch target; updated to actual
date on App Store / Play Store publication)
**Last Revised:** 2026-05-17

자국 ("Service") complies with the Personal Information Protection Act
of the Republic of Korea ("PIPA"), the EU General Data Protection
Regulation ("GDPR"), and applicable law.

This English text is a non-authoritative translation provided for
reference. In case of any conflict, the Korean version of this Privacy
Policy controls.

## 1. Personal Information Collected

**Required for account creation:** email address, provider identifier
(Apple / Google / Supabase), and (for email signup only) bcrypt hash of
password. Apple Private Email Relay addresses are accepted when the user
selects "Hide My Email".

**Collected during use:**
- Location (latitude/longitude, foreground only, used when "My Location"
  button is tapped). NOT stored on the server — used only for camera
  movement.
- Device OS and version (for crash reports).
- Anonymized crash logs (via Sentry).
- IP address (for security, abuse prevention; not retained beyond
  request processing + 90-day log).

**User content (you create):** saved place names, coordinates,
categories, notes (up to 200 chars), color tags, visited status, source
URLs (Instagram / Naver / Threads etc.), cached OG metadata, anchor
coordinates (HOME / SCHOOL / WORK).

## 2. Purposes of Use

- User identification and authentication (contract performance, GDPR
  Art. 6(1)(b))
- User-scoped data isolation via Row Level Security
- Syncing and displaying saved places
- Camera movement when "My Location" is tapped (explicit consent, GDPR
  Art. 6(1)(a))
- Stability monitoring (legitimate interest, GDPR Art. 6(1)(f))
- Security and abuse prevention

The Service does NOT use personal information for marketing emails,
advertising identifiers, or third-party data sales.

## 3. Retention Periods

- Account info and user content: deleted permanently within 30 days
  after account closure (30-day grace period for accidental closure
  recovery)
- Crash logs (Sentry): 30 days from collection
- IP addresses: discarded after request processing (logs retained max
  90 days)

## 4. Third-Party Processors

The Service entrusts the following processors:

- **Supabase** (US, but AWS ap-northeast-2 Seoul region): auth, DB,
  Edge Functions
- **Mapbox** (US): map tile rendering
- **Naver** (KR): place search (Local Search API)
- **Cloudflare** (US, global CDN): static asset hosting
- **Apple, Google** (US): authentication tokens
- **Sentry** (US): crash reporting

Cross-border transfers occur to the US and global infrastructure for
service provision. Each processor maintains GDPR Standard Contractual
Clauses or equivalent safeguards.

## 5. Your Rights

You have the right to:
- Access your personal information (PIPA Art. 35 / GDPR Art. 15)
- Rectify or erase it (PIPA Art. 36 / GDPR Art. 16, 17)
- Restrict processing (PIPA Art. 37 / GDPR Art. 18)
- Data portability — download your saved content as JSON or CSV (v1.5+)
  (GDPR Art. 20)
- Withdraw consent at any time via the in-app "Delete Account" option
  (GDPR Art. 7(3))
- Object to legitimate-interest processing (GDPR Art. 21)

To exercise these rights, contact us at the email in Section 9. We will
respond within 30 days.

## 6. Data Destruction

Account closure or expired retention → 30-day grace period → permanent
deletion via SQL `DELETE`. External processor data expires per each
processor's policy.

## 7. Security Measures

- TLS 1.2+ encrypted communication
- bcrypt-hashed passwords (no plaintext storage)
- Row Level Security for user-data isolation
- Dependency security monitoring; critical CVE patches within 72 hours
- Data-breach notification to PIPC / relevant DPA within 72 hours
  (GDPR Art. 33)

## 8. Automated Decision-Making

The Service does not perform automated decision-making or profiling
based on your personal information.

## 9. Data Protection Officer Contact

DPO Contact: **[TODO: operator email]**

The Service operator is an individual (no business registration). For
inquiries, complaints, or rights requests, contact the email above.
Response within 7 business days.

## 10. Changes to This Policy

This policy may change. Material changes will be notified via in-app
notice or email. Continued use after changes constitutes acceptance.

---

_If you find issues with this Privacy Policy, contact the operator
above. Korean text controls in case of translation discrepancy._
