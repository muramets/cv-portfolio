# Timeline Cursor Glow & Detective Magnifying Glass

## Current State
В разделе **Experience (Professional Journey)** на странице `about.html` курсор пользователя управляет динамическим фоновым свечением («лупой детектива»). При наведении мыши свет плавно следит за курсором по всей рабочей области таймлайна и подсвечивает пространство под карточками ролей, пунктирной рельсой и кнопкой раскрытия дополнительных карточек («Show more / Earlier timeline»).

Свечение живет **строго под подложкой бумаги (`z-index: 0`)** под карточками ролей и кнопкой `Show more` (`.timeline-expand`, `z-index: 6`). Восстановлен полный 680px x 520px объем пятна света с 100% сочным радиальным градиентом. Текст карточек остаётся на 100% нетронутым маской, а правый край свечения плавно уходит в `transparent` за 140px до границы бумаги на изолированном слое `.timeline-glow-layer`.

Для обеспечения 60–120 FPS в браузерах WebKit (Safari):
1. Движение пятен свечения осуществляется через прямое GPU-композитирование `translate3d(x, y, 0)` на элементах `.timeline-glow-primary` и `.timeline-glow-secondary`.
2. Морфинг и вращение вынесены на псевдоэлементы `::before`, а в Safari постоянная keyframe-анимация отключена для предотвращения тяжелой перекомпоновки 70 мс/кадр.
3. Размеры подложки закэшированы (`updateGlowDimensions`), а в `runHeight()` сброшен вызов `void list.offsetHeight`, устраняя Layout Thrashing (Forced Synchronous Layouts).

## Roadmap
- [x] Плавный отклик свечения на движение курсора по ширине и высоте таймлайна (`insetX = 220px`).
- [x] Восстановленный 680px x 520px богатый объем радиального градиента свечения.
- [x] Изолированный слой подложки `.timeline-glow-layer` (`z-index: 0`) с клиппингом и плавным уходом в ноль.
- [x] Закрепление слоя свечения строго ПОД бумагой и кнопкой `Show more` (`z-index: 0` vs `z-index: 6`).
- [x] **Оптимизация производительности в WebKit/Safari:** устранение Layout Thrashing, отключение фонового morph-keyframe в WebKit для поддержания 60–120 FPS. ← YOU ARE HERE
- [ ] (Market-Ready Vision): Адаптивная гироскопическая или тач-подсветка на мобильных устройствах при прокрутке.

## Technical Implementation

### Key Files
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L760-L980) — Функция `initTimelineCollapse()`: закэшированные размеры `pW/pH/sW/sH`, `requestAnimationFrame` в `runHeight()`, аппаратный `translate3d` без обращения к DOM-геометрии.
- [components.css](file:///Users/muramets/Documents/CV/css/components.css#L270-L360) — Классы `.timeline-glow-layer`, `.timeline-glow-primary`, `.timeline-glow-secondary` с Safari-адаптированной анимацией.
