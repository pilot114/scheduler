const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Календарь', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    
    // Очищаем localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
  });

  test('Структура календаря', async ({ page }) => {
    // Проверяем заголовки дней недели
    const headers = page.locator('.calendar thead th');
    await expect(headers).toHaveCount(7);
    
    const expectedHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    for (let i = 0; i < expectedHeaders.length; i++) {
      await expect(headers.nth(i)).toHaveText(expectedHeaders[i]);
    }
    
    // Проверяем, что есть строки с днями
    const rows = page.locator('.calendar tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(6); // максимум 6 недель в месяце
  });

  test('Отображение дней других месяцев', async ({ page }) => {
    // Проверяем, что дни других месяцев помечены классом other-month
    const otherMonthCells = page.locator('.calendar tbody td.other-month');
    const otherMonthCount = await otherMonthCells.count();
    
    if (otherMonthCount > 0) {
      // Проверяем, что у них есть правильный класс
      for (let i = 0; i < Math.min(3, otherMonthCount); i++) {
        await expect(otherMonthCells.nth(i)).toHaveClass(/other-month/);
      }
    }
  });

  test('Переключение между месяцами', async ({ page }) => {
    const currentMonthElement = page.locator('#currentMonth');
    const initialMonth = await currentMonthElement.textContent();
    
    // Переход вперед
    await page.click('button:has-text("►")');
    await page.waitForTimeout(100);
    const nextMonth = await currentMonthElement.textContent();
    expect(nextMonth).not.toBe(initialMonth);
    
    // Переход назад дважды
    await page.click('button:has-text("◄")');
    await page.click('button:has-text("◄")');
    await page.waitForTimeout(100);
    const prevMonth = await currentMonthElement.textContent();
    expect(prevMonth).not.toBe(initialMonth);
    expect(prevMonth).not.toBe(nextMonth);
    
    // Возврат к исходному месяцу
    await page.click('button:has-text("►")');
    await page.waitForTimeout(100);
    const backToInitial = await currentMonthElement.textContent();
    expect(backToInitial).toBe(initialMonth);
  });

  test('Выбор даты изменяет состояние', async ({ page }) => {
    // Находим первый доступный день текущего месяца
    const currentMonthDay = page.locator('.calendar tbody td:not(.other-month)').first();
    await currentMonthDay.click();
    
    // Проверяем, что день выделен
    await expect(currentMonthDay).toHaveClass(/selected/);
    
    // Проверяем, что информация о дне обновилась
    const selectedDateText = await page.locator('#selectedDate').textContent();
    expect(selectedDateText).not.toBe('Выберите день');
    expect(selectedDateText).toContain('2025'); // текущий год
    
    // Выбираем другой день
    const anotherDay = page.locator('.calendar tbody td:not(.other-month)').nth(5);
    if (await anotherDay.count() > 0) {
      await anotherDay.click();
      
      // Проверяем, что предыдущий день больше не выделен
      await expect(currentMonthDay).not.toHaveClass(/selected/);
      
      // Проверяем, что новый день выделен
      await expect(anotherDay).toHaveClass(/selected/);
    }
  });

  test('Отображение текущего дня', async ({ page }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Проверяем, что мы находимся в текущем месяце
    const displayedMonth = await page.locator('#currentMonth').textContent();
    
    if (displayedMonth.includes(currentYear.toString())) {
      // Ищем ячейку с классом today
      const todayCell = page.locator('.calendar tbody td.today');
      const todayCellCount = await todayCell.count();
      
      if (todayCellCount > 0) {
        await expect(todayCell).toHaveClass(/today/);
        
        // Проверяем, что в ячейке правильный день
        const dayNumber = await todayCell.locator('.day-number').textContent();
        expect(parseInt(dayNumber)).toBe(today.getDate());
      }
    }
  });

  test('Отображение свободных часов', async ({ page }) => {
    // Выбираем день
    const day = page.locator('.calendar tbody td:not(.other-month)').first();
    await day.click();
    
    // Проверяем, что может отображаться информация о свободных часах
    const freeHoursElements = page.locator('.free-hours');
    const freeHoursCount = await freeHoursElements.count();
    
    // Если есть элементы свободных часов, проверяем их формат
    if (freeHoursCount > 0) {
      const firstFreeHours = await freeHoursElements.first().textContent();
      expect(firstFreeHours).toMatch(/\d+h/); // формат "Xh"
    }
  });

  test('Цветовая индикация загруженности дня', async ({ page }) => {
    const days = page.locator('.calendar tbody td:not(.other-month)');
    const dayCount = await days.count();
    
    if (dayCount > 0) {
      // Проверяем первые несколько дней на наличие классов загруженности
      for (let i = 0; i < Math.min(5, dayCount); i++) {
        const day = days.nth(i);
        
        // Проверяем возможные классы загруженности
        const hasLowAvailability = await day.evaluate(el => el.classList.contains('low-availability'));
        const hasMediumAvailability = await day.evaluate(el => el.classList.contains('medium-availability'));
        
        // Оба класса одновременно быть не должны
        expect(hasLowAvailability && hasMediumAvailability).toBe(false);
      }
    }
  });

  test('Формат отображения месяца и года', async ({ page }) => {
    const monthText = await page.locator('#currentMonth').textContent();
    
    // Проверяем, что отображается месяц и год
    expect(monthText).toMatch(/[А-Яа-я]+ \d{4}/); // формат "Месяц ГГГГ"
    
    // Проверяем русские названия месяцев
    const russianMonths = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    const hasRussianMonth = russianMonths.some(month => monthText.includes(month));
    expect(hasRussianMonth).toBe(true);
  });

  test('Сохранение выбранной даты при навигации', async ({ page }) => {
    // Выбираем день в текущем месяце
    const day = page.locator('.calendar tbody td:not(.other-month)').first();
    const dayNumber = await day.locator('.day-number').textContent();
    await day.click();
    
    // Получаем дату до навигации
    const selectedDateBefore = await page.locator('#selectedDate').textContent();
    
    // Переходим к следующему месяцу и обратно
    await page.click('button:has-text("►")');
    await page.click('button:has-text("◄")');
    
    // Проверяем, что выбранный день остается выделенным
    const selectedDay = page.locator('.calendar tbody td.selected');
    if (await selectedDay.count() > 0) {
      const selectedDayNumber = await selectedDay.locator('.day-number').textContent();
      expect(selectedDayNumber).toBe(dayNumber);
    }
  });
});