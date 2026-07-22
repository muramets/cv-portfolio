# Timeline Cursor Glow & Detective Magnifying Glass

## Current State
В разделе **Experience (Professional Journey)** на странице `about.html` курсор пользователя управляет динамическим фоновым свечением («лупой детектива»). При наведении мыши свет плавно следит за курсором по всей рабочей области таймлайна и подсвечивает пространство под карточками ролей, пунктирной рельсой и кнопкой раскрытия дополнительных карточек («Show more / Earlier timeline»).

Свечение живет **строго под подложкой бумаги (`z-index: 0`)** под карточками ролей и кнопкой `Show more` (`.timeline-expand`, `z-index: 6`). Восстановлен полный 680px x 520px объем пятна света с 100% сочным радиальным градиентом. Текст карточек остаётся на 100% нетронутым маской, а правый край свечения плавно уходит в `transparent` за 140px до границы бумаги на изолированном слое `.timeline-glow-layer`.

По решению пользователя фоновое свечение `.timeline-glow-layer` **полностью отключено только в браузерах Safari** (`html.is-webkit-safari .journey-layout__timeline .timeline-glow-layer { display: none !important; }`), чтобы обеспечить 100% легкость скролла в WebKit. В Chrome, Edge и Firefox свечение активна в полном объеме.

## Roadmap
- [x] Плавный отклик свечения на движение курсора по ширине и высоте таймлайна (`insetX = 220px`).
- [x] Восстановленный 680px x 520px богатый объем радиального градиента свечения.
- [x] Изолированный слой подложки `.timeline-glow-layer` (`z-index: 0`) с маской растворения края бумаги.
- [x] Закрепление слоя свечения строго ПОД бумагой и кнопкой `Show more` (`z-index: 0` vs `z-index: 6`).
- [x] **Отключение свечения в WebKit/Safari:** слой `.timeline-glow-layer` скрыт только в Safari для идеальной лёгкости верстки. ← YOU ARE HERE
- [ ] (Market-Ready Vision): Адаптивная гироскопическая или тач-подсветка на мобильных устройствах при прокрутке.

## Technical Implementation

### Key Files
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L760-L980) — Функция `initTimelineCollapse()`: закэшированные размеры `pW/pH/sW/sH`, `requestAnimationFrame` в `runHeight()`, аппаратный `translate3d`.
- [components.css](file:///Users/muramets/Documents/CV/css/components.css#L340-L345) — Правило `html.is-webkit-safari .journey-layout__timeline .timeline-glow-layer { display: none !important; }`.
