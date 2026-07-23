# Journey Collapse & Smooth Bézier Scroll to Contact

## Current State
При нажатии на «Recent only ↑» сворачивание идёт в две фазы одного жеста:

1. **Компенсированный fold** (`animateCollapseFold`): высота списка и позиция скролла ведутся вместе из одного rAF-цикла. На каждом кадре `scrollY` уменьшается ровно на столько, на сколько сжался список (`lenisInstance.scrollTo(..., { immediate: true, force: true })`), поэтому нижняя кромка Journey остаётся неподвижной на экране, и пользователь видит, как карточки плавно складываются — как при естественном скролле вверх сквозь свёрнутую страницу. Длительность масштабируется от дельты высоты (520–900ms).
2. **Тяжёлый доезд** (`scrollToPageEnd`): после осадки fold и однократного `lenisInstance.resize()` тот же импульс продолжается кастомным Lenis-скроллом (`contactFocusEasing`, 0.9–1.6s по дистанции) из свёрнутого состояния вниз до «Get in Touch».

## Known Gotchas
- **Некомпенсированное сжатие читается как мгновенный скачок.** Если во время сжатия `scrollY` стоит на месте, весь контент ниже списка (кнопка, Get in Touch) поднимается на полную дельту (~2000px за полсекунды) — визуально это «резкое схлопывание с фокусом на Get in Touch», независимо от кривой самой высоты. Единственное лекарство — покадровая компенсация скролла.
- **Компенсацию нельзя вести через Lenis.** Даже `scrollTo(..., { immediate: true })` проходит через lerp Lenis: применённая позиция отстаёт от записанной на сотни пикселей, браузер прижимает скролл к сжимающемуся низу документа — «нырок» к футеру. На время fold Lenis выключается (`stop()`), скролл ведётся нативным `window.scrollTo`, после — `resize()` + `scrollTo(current, immediate, force)` + `start()`, иначе `start()` отбрасывает страницу к до-fold позиции.
- **`lenisInstance.resize()` жёстко подрезает скролл под новый лимит без сглаживания.** Вызывать его можно только когда скролл гарантированно ниже нового лимита (после компенсированного fold), не покадрово во время сжатия.
- **Scroll-driven `journey-sheet-settle` ломает sticky-заголовок во время fold.** Секция каждый кадр меняет высоту → view-timeline transform переприменяется → transform на предке отменяет sticky, и заголовок Journey исчезает. На время жеста ставится `body.is-journey-collapsing`, отключающий анимацию листа (layout.css).
- **`onComplete` Lenis не вызывается при прерывании траектории** (колесо пользователя) — без fail-safe таймера промис `scrollToPageEnd` зависает и кнопка таймлайна остаётся мёртвой до перезагрузки.
- **Токен `foldToken`** гасит любой «осиротевший» rAF-цикл fold: после завершения жеста ни один отложенный кадр не может снова двигать скролл.

## Roadmap
- [x] Определение геометрии свёрнутого Journey (3 роли).
- [x] Компенсированный fold: высота и скролл в одном rAF-цикле, кромка Journey неподвижна на экране (`animateCollapseFold`).
- [x] Тяжёлый кастомный Lenis-скролл из свёрнутого состояния до Get in Touch на том же импульсе (`scrollToPageEnd`). ← YOU ARE HERE
- [ ] (Market-Ready Vision): Интерактивный мини-навигатор таймлайна с превью скрытых ролей при наведении на компактную кнопку.

## Technical Implementation

### Key Files
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L244-L325) — Функция `initSectionBar()`: ограничение `getSectionViewportTarget` для последней секции значением `maxScroll - 8` и проверка `isAtBottom` в `syncScrollSpy()`, гарантирующие подсветку таба «Collab» (Get in Touch) во floating bar при прокрутке до низа страницы.
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L1075-L1210) — Функции `animateCollapseFold()`, `scrollToPageEnd()` и `collapseToRecent()`: компенсированный fold, затем тяжёлый доезд до Get in Touch. `animateListHeight()` (CSS-transition) остаётся только для `expandNext()`.



