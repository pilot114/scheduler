const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Режим просмотра года', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');

    // Очищаем localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
  });

  test('Кнопка переключения режима присутствует', async ({ page }) => {
    await expect(page.locator('#view-mode-btn')).toBeVisible();

    // Проверяем иконку и подсказку
    const buttonText = await page.locator('#view-mode-btn').textContent();
    expect(buttonText).toBe('📅');

    const title = await page.locator('#view-mode-btn').getAttribute('title');
    expect(title).toContain('Переключить');
  });

  test('Переключение на режим года', async ({ page }) => {
    // Кликаем на кнопку переключения режима
    await page.click('#view-mode-btn');

    // Проверяем, что основной контейнер получил класс year-view
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toHaveClass(/year-view/);

    // Проверяем, что панель дня скрыта
    const dayPanel = page.locator('.day-panel');
    await expect(dayPanel).not.toBeVisible();

    // Проверяем, что иконка кнопки изменилась
    const buttonText = await page.locator('#view-mode-btn').textContent();
    expect(buttonText).toBe('📆');
  });

  test('Переключение обратно на режим месяца', async ({ page }) => {
    // Переключаемся на год
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Переключаемся обратно на месяц
    await page.click('#view-mode-btn');

    // Проверяем, что класс year-view убран
    const mainContent = page.locator('.main-content');
    await expect(mainContent).not.toHaveClass(/year-view/);

    // Проверяем, что панель дня видна
    const dayPanel = page.locator('.day-panel');
    await expect(dayPanel).toBeVisible();

    // Проверяем, что иконка кнопки вернулась
    const buttonText = await page.locator('#view-mode-btn').textContent();
    expect(buttonText).toBe('📅');
  });

  test('Годовой календарь показывает все дни года', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем, что есть строки с днями
    const rows = page.locator('#calendarBody tr');
    const rowCount = await rows.count();

    // Для 365 дней с 14 днями в строке должно быть примерно 27 строк (365/14 ≈ 26.07)
    expect(rowCount).toBeGreaterThanOrEqual(26);
    expect(rowCount).toBeLessThanOrEqual(28); // На случай високосного года
  });

  test('Дни года отображаются с индикаторами месяцев', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем, что первые дни месяцев имеют метки с названием месяца
    const dayNumbers = page.locator('.day-number');
    const firstDayNumbers = await dayNumbers.allTextContents();

    // Проверяем, что есть метки месяцев (например, "1 Янв", "1 Фев", и т.д.)
    const hasMonthLabels = firstDayNumbers.some(text => /\d+\s+[А-Я][а-я]{2}/.test(text));
    expect(hasMonthLabels).toBe(true);
  });

  test('Годовой календарь показывает свободные часы', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие индикаторов свободных часов
    const freeHoursElements = page.locator('.free-hours');
    const count = await freeHoursElements.count();

    // Должно быть много дней со свободными часами (почти все дни года)
    expect(count).toBeGreaterThan(300);
  });

  test('Навигация по годам работает в режиме года', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Получаем текущий год
    const currentYear = await page.locator('#currentMonth').textContent();
    const year = parseInt(currentYear);

    // Кликаем на кнопку следующего периода
    await page.click('.month-selector button:last-child');
    await page.waitForTimeout(300);

    // Проверяем, что год увеличился
    const nextYear = await page.locator('#currentMonth').textContent();
    expect(parseInt(nextYear)).toBe(year + 1);

    // Кликаем на кнопку предыдущего периода дважды
    await page.click('.month-selector button:first-child');
    await page.waitForTimeout(300);
    await page.click('.month-selector button:first-child');
    await page.waitForTimeout(300);

    // Проверяем, что год уменьшился на 1 от исходного
    const prevYear = await page.locator('#currentMonth').textContent();
    expect(parseInt(prevYear)).toBe(year - 1);
  });

  test('Цветовая индикация занятости работает в годовом режиме', async ({ page }) => {
    // Создаем задачу на весь день
    await page.evaluate(() => {
      const today = new Date();
      const tasks = [
        {
          id: '1',
          type: 'single',
          title: 'Очень долгая задача',
          time: '08:00',
          duration: '600', // 10 часов
          date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        }
      ];
      localStorage.setItem('tasks', JSON.stringify(tasks));
    });

    await page.reload();
    await page.waitForSelector('.calendar');

    // Переключаемся на годовой режим
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие ячеек с разными уровнями доступности
    const lowAvailability = page.locator('.year-month .low-availability');
    const mediumAvailability = page.locator('.year-month .medium-availability');

    // Должна быть хотя бы одна ячейка с низкой доступностью (наша задача)
    const lowCount = await lowAvailability.count();
    expect(lowCount).toBeGreaterThan(0);
  });

  test('Сегодняшняя дата выделена в годовом режиме', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие ячейки с классом today
    const todayCell = page.locator('.year-month .today');
    await expect(todayCell).toHaveCount(1);
  });

  test('Режим просмотра сохраняется при навигации', async ({ page }) => {
    // Переключаемся на годовой режим
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Навигация вперед
    await page.click('.month-selector button:last-child');
    await page.waitForTimeout(300);

    // Проверяем, что все еще в годовом режиме
    const mainContent = page.locator('.main-content');
    await expect(mainContent).toHaveClass(/year-view/);

    // Проверяем, что панель дня все еще скрыта
    const dayPanel = page.locator('.day-panel');
    await expect(dayPanel).not.toBeVisible();
  });
});
