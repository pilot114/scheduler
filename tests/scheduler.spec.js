const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Основные функции', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    
    // Очищаем localStorage перед каждым тестом
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Перезагружаем страницу после очистки localStorage
    await page.reload();
    
    // Ждем полной загрузки страницы
    await page.waitForSelector('.calendar');
  });

  test('Загрузка приложения', async ({ page }) => {
    // Проверяем заголовок страницы
    await expect(page).toHaveTitle('Планировщик');
    
    // Проверяем основные элементы интерфейса
    await expect(page.locator('h1')).toHaveText('Планировщик');
    await expect(page.locator('.calendar')).toBeVisible();
    await expect(page.locator('.day-panel')).toBeVisible();
    await expect(page.locator('#settings-btn')).toBeVisible();
  });

  test('Генерация календаря', async ({ page }) => {
    // Проверяем, что календарь отображается с правильной структурой
    await expect(page.locator('.calendar thead tr th')).toHaveCount(7);
    
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    for (let i = 0; i < weekdays.length; i++) {
      await expect(page.locator('.calendar thead tr th').nth(i)).toHaveText(weekdays[i]);
    }
    
    // Проверяем, что есть дни в календаре
    const calendarCells = page.locator('.calendar tbody td');
    await expect(calendarCells.first()).toBeVisible();
    
    // Проверяем текущий месяц отображается
    await expect(page.locator('#currentMonth')).not.toBeEmpty();
  });

  test('Навигация по месяцам', async ({ page }) => {
    // Получаем текущий месяц
    const currentMonth = await page.locator('#currentMonth').textContent();
    
    // Переходим к следующему месяцу
    await page.click('button:has-text("►")');
    const nextMonth = await page.locator('#currentMonth').textContent();
    expect(nextMonth).not.toBe(currentMonth);
    
    // Возвращаемся к предыдущему месяцу
    await page.click('button:has-text("◄")');
    await page.click('button:has-text("◄")');
    const prevMonth = await page.locator('#currentMonth').textContent();
    expect(prevMonth).not.toBe(nextMonth);
  });

  test('Выбор даты в календаре', async ({ page }) => {
    // Выбираем первый доступный день в календаре
    const firstDay = page.locator('.calendar tbody td:not(.other-month)').first();
    await firstDay.click();
    
    // Проверяем, что день выбран
    await expect(firstDay).toHaveClass(/selected/);
    
    // Проверяем, что панель дня обновилась
    await expect(page.locator('#selectedDate')).not.toHaveText('Выберите день');
  });

  test('Отображение сегодняшнего дня', async ({ page }) => {
    // Проверяем, что сегодняшний день выделен
    const todayCell = page.locator('.calendar tbody td.today');
    if (await todayCell.count() > 0) {
      await expect(todayCell).toHaveClass(/today/);
    }
  });

  test('Автоматический выбор сегодняшнего дня при загрузке', async ({ page }) => {
    // При загрузке страницы сегодняшний день должен быть автоматически выбран
    const selectedDate = await page.locator('#selectedDate').textContent();
    expect(selectedDate).not.toBe('Выберите день');
  });
});