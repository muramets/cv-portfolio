# Journey Collapse & Smooth Bézier Scroll to Contact

## Current State
При нажатии на «Recent only ↑» в разделе Professional Journey список свертывается до 3 последних ролей. Целевой скролл рассчитывается через `getContactFocusTarget()`, что выравнивает заголовок «Get in Touch» ровно под floating bar в самом верху экрана и полностью сгоняет Professional Journey наверх за пределы видимости. Прокрутка выполняется единым плавным Bézier-скроллом.

## Roadmap
- [x] Определение геометрии свёрнутого Journey (3 роли).
- [x] Рассчет стартовой позиции скролла без мгновенного прыжка в конец страницы.
- [x] Однородный плавный Bézier-скролл от свёрнутого Journey до полного фокуса на Get in Touch. ← YOU ARE HERE
- [ ] (Market-Ready Vision): Интерактивный мини-навигатор таймлайна с превью скрытых ролей при наведении на компактную кнопку.

## Technical Implementation

### Key Files
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L244-L325) — Функция `initSectionBar()`: ограничение `getSectionViewportTarget` для последней секции значением `maxScroll - 8` и проверка `isAtBottom` в `syncScrollSpy()`, гарантирующие подсветку таба «Collab» (Get in Touch) во floating bar при прокрутке до низа страницы.
- [main.js](file:///Users/muramets/Documents/CV/js/main.js#L1160-L1213) — Функция `collapseToRecent()`: свертывание списка, вычисление высоты свёрнутого списка и плавный переход через `scrollToPageEnd()`.
