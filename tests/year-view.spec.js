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

  test('Годовой календарь показывает 12 месяцев блоками', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем, что есть 12 блоков месяцев
    const monthBlocks = page.locator('.month-block');
    const blockCount = await monthBlocks.count();

    expect(blockCount).toBe(12);
  });

  test('Блоки месяцев имеют заголовки с названиями', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем, что у каждого блока есть заголовок
    const monthHeaders = page.locator('.month-block-header');
    const headerCount = await monthHeaders.count();

    expect(headerCount).toBe(12);

    // Проверяем наличие хотя бы одного названия месяца
    const headerTexts = await monthHeaders.allTextContents();
    expect(headerTexts).toContain('Январь');
  });

  test('Блоки месяцев имеют текстовые поля для заметок', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие текстовых полей для заметок
    const noteFields = page.locator('.month-note');
    const count = await noteFields.count();

    // Должно быть 12 полей для заметок (по одному на месяц)
    expect(count).toBe(12);
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

  test('Блоки месяцев имеют кнопки подробнее', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие кнопок "Подробнее"
    const detailsButtons = page.locator('.month-details-btn');
    const count = await detailsButtons.count();

    // Должно быть 12 кнопок (по одной на месяц)
    expect(count).toBe(12);

    // Проверяем текст кнопки
    const buttonTexts = await detailsButtons.allTextContents();
    buttonTexts.forEach(text => {
      expect(text).toBe('Подробнее');
    });
  });

  test('Текущий месяц выделен в годовом режиме', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем наличие блока текущего месяца с классом current-month
    const currentMonthBlock = page.locator('.month-block.current-month');
    await expect(currentMonthBlock).toHaveCount(1);
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

  test('Заметки месяцев сохраняются в localStorage', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Вводим текст в первое поле заметки
    const firstNote = page.locator('.month-note').first();
    await firstNote.fill('Тестовый план на январь');
    await page.waitForTimeout(500);

    // Перезагружаем страницу
    await page.reload();
    await page.waitForSelector('.calendar');

    // Переключаемся обратно на годовой режим
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Проверяем, что текст сохранился
    const savedNote = page.locator('.month-note').first();
    await expect(savedNote).toHaveValue('Тестовый план на январь');
  });

  test('Кнопка "Подробнее" переключает на режим месяца', async ({ page }) => {
    await page.click('#view-mode-btn');
    await page.waitForTimeout(300);

    // Кликаем на первую кнопку "Подробнее"
    const firstDetailsBtn = page.locator('.month-details-btn').first();
    await firstDetailsBtn.click();
    await page.waitForTimeout(300);

    // Проверяем, что вернулись в режим месяца
    const mainContent = page.locator('.main-content');
    await expect(mainContent).not.toHaveClass(/year-view/);

    // Проверяем, что панель дня видна
    const dayPanel = page.locator('.day-panel');
    await expect(dayPanel).toBeVisible();
  });
});
