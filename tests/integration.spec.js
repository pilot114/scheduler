const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Интеграционные тесты', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    
    // Очищаем localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
  });

  test('Полный цикл работы с задачей', async ({ page }) => {
    // Выбираем день в календаре
    const day = page.locator('.calendar tbody td:not(.other-month)').first();
    await day.click();
    await expect(day).toHaveClass(/selected/);
    
    // Кликаем на свободный временной слот
    const timeGap = page.locator('.time-gap').first();
    if (await timeGap.count() > 0) {
      await timeGap.click();
      
      // Создаем задачу
      await expect(page.locator('#taskModal')).toBeVisible();
      await page.fill('#taskTitle', 'Интеграционная задача');
      await page.fill('#taskDescription', 'Тестирование полного цикла');
      await page.click('button[type="submit"]');
      
      // Проверяем, что задача появилась
      await expect(page.locator('.task-item')).toHaveCount(1);
      await expect(page.locator('.task-title')).toHaveText('Интеграционная задача');
      
      // Редактируем задачу
      await page.click('button:has-text("Редактировать")');
      await expect(page.locator('#taskModal')).toBeVisible();
      await page.fill('#taskTitle', 'Измененная задача');
      await page.click('button[type="submit"]');
      
      // Проверяем изменения
      await expect(page.locator('.task-title')).toHaveText('Измененная задача');
      
      // Завершаем задачу
      if (await page.locator('button:has-text("Завершить")').count() > 0) {
        await page.click('button:has-text("Завершить")');
        await expect(page.locator('.task-item')).toHaveClass(/completed/);
      }
      
      // Удаляем задачу
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.click('button:has-text("Удалить")');
      await expect(page.locator('.task-item')).toHaveCount(0);
    }
  });

  test('Работа с настройками и их влияние на интерфейс', async ({ page }) => {
    // Открываем настройки и меняем шаг времени
    await page.click('#settings-btn');
    await page.check('input[name="step"][value="30"]');
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    
    // Выбираем день и создаем задачу
    const day = page.locator('.calendar tbody td:not(.other-month)').first();
    await day.click();
    
    // Программно открываем модальное окно создания задачи
    await page.evaluate(() => {
      window.showAddTaskModal();
    });
    
    // Проверяем, что шаг времени изменился в элементах управления
    const timeStep = await page.locator('#taskTime').getAttribute('step');
    expect(timeStep).toBe('30');
    
    const durationStep = await page.locator('#taskDuration').getAttribute('step');
    expect(durationStep).toBe('30');
    
    await page.click('button:has-text("Отмена")');
    
    // Включаем темную тему
    await page.click('#settings-btn');
    await page.check('#theme-toggle-modal');
    
    // Проверяем, что тема применилась
    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    expect(hasDarkMode).toBe(true);
  });

  test('Навигация по календарю с задачами', async ({ page }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Создаем задачу на текущую дату
    const todayStr = today.toISOString().split('T')[0];
    await page.evaluate((dateStr) => {
      const task = {
        id: '1',
        type: 'single',
        title: 'Задача текущего месяца',
        time: '10:00',
        duration: '60',
        date: dateStr
      };
      window.tasks = [task];
      window.saveTasks();
    }, todayStr);
    
    // Выбираем текущий день
    const todayCell = page.locator(`[data-date="${todayStr}"]`);
    if (await todayCell.count() > 0) {
      await todayCell.click();
      
      // Ждем появления задачи с таймаутом
      await page.waitForSelector('.task-item', { timeout: 5000 });
      
      // Проверяем, что задача отображается
      await expect(page.locator('.task-item')).toHaveCount(1);
      
      // Переходим к следующему месяцу
      await page.click('button:has-text("►")');
      
      // Проверяем, что задача не отображается в другом месяце
      await expect(page.locator('.task-item')).toHaveCount(0);
      
      // Возвращаемся к текущему месяцу
      await page.click('button:has-text("◄")');
      
      // Выбираем тот же день снова
      if (await todayCell.count() > 0) {
        await todayCell.click();
        
        // Проверяем, что задача снова отображается
        await expect(page.locator('.task-item')).toHaveCount(1);
      }
    }
  });

  test('Создание и отображение повторяющихся задач', async ({ page }) => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    
    // Создаем ежедневную повторяющуюся задачу
    await page.evaluate(({ startDate, endDate }) => {
      const task = {
        id: '1',
        type: 'recurring',
        title: 'Ежедневная задача',
        time: '09:00',
        duration: '30',
        recurringType: 'daily',
        startDate: startDate,
        endDate: endDate
      };
      window.tasks = [task];
      window.saveTasks();
    }, { startDate: today.toISOString().split('T')[0], endDate: nextMonth.toISOString().split('T')[0] });
    
    // Выбираем текущий день
    const todayStr = today.toISOString().split('T')[0];
    const todayCell = page.locator(`[data-date="${todayStr}"]`);
    
    if (await todayCell.count() > 0) {
      await todayCell.click();
      
      // Ждем появления задач
      await page.waitForSelector('.task-item', { timeout: 5000 });
      
      // Проверяем, что повторяющаяся задача отображается
      await expect(page.locator('.task-item.recurring')).toHaveCount(1);
      await expect(page.locator('.task-title')).toHaveText('Ежедневная задача');
      
      // Переходим к следующему дню
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const tomorrowCell = page.locator(`[data-date="${tomorrowStr}"]`);
      
      if (await tomorrowCell.count() > 0) {
        await tomorrowCell.click();
        
        // Проверяем, что задача отображается и завтра
        await expect(page.locator('.task-item.recurring')).toHaveCount(1);
      }
    }
  });

  test('Экспорт и импорт с сохранением функциональности', async ({ page }) => {
    // Создаем тестовые данные
    await page.evaluate(() => {
      const tasks = [
        {
          id: '1',
          type: 'single',
          title: 'Обычная задача',
          time: '10:00',
          duration: '60',
          date: new Date().toISOString().split('T')[0]
        },
        {
          id: '2',
          type: 'recurring',
          title: 'Повторяющаяся задача',
          time: '15:00',
          duration: '30',
          recurringType: 'weekly',
          weekdays: ['1', '3', '5'], // Пн, Ср, Пт
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ];
      const settings = {
        step: 15,
        theme: 'dark-mode',
        notifications: false
      };
      
      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('settings', JSON.stringify(settings));
      
      // Перезагружаем данные
      if (window.loadTasks) {
        window.loadTasks();
      }
      if (window.loadSettings) {
        window.loadSettings();
      }
      if (window.updateCalendar) {
        window.updateCalendar();
      }
    });
    
    // Обновляем страницу для применения загруженных данных
    await page.reload();
    await page.waitForSelector('.calendar');
    
    // Проверяем, что данные отображаются
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(`[data-date="${todayStr}"]`);
    
    if (await todayCell.count() > 0) {
      await todayCell.click();
      // Ждем появления задач
      await page.waitForSelector('.task-item', { timeout: 5000 });
      const taskCount = await page.locator('.task-item').count();
      expect(taskCount).toBeGreaterThan(0);
    }
    
    // Экспортируем данные
    await page.click('#settings-btn');
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-btn');
    const download = await downloadPromise;
    
    // Очищаем данные
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
    
    // Проверяем, что данные очистились
    if (await todayCell.count() > 0) {
      await todayCell.click();
      await expect(page.locator('.task-item')).toHaveCount(0);
    }
    
    // Имитируем импорт данных
    await page.click('#settings-btn');
    
    page.on('dialog', async dialog => {
      if (dialog.message().includes('успешно импортированы')) {
        await dialog.accept();
      }
    });
    
    // Программно создаем событие импорта с теми же данными
    await page.evaluate(() => {
      const testData = {
        tasks: [
          {
            id: '1',
            type: 'single',
            title: 'Обычная задача',
            time: '10:00',
            duration: '60',
            date: new Date().toISOString().split('T')[0]
          }
        ],
        settings: {
          step: 15,
          theme: 'dark-mode',
          notifications: false
        }
      };
      
      const blob = new Blob([JSON.stringify(testData)], { type: 'application/json' });
      const file = new File([blob], 'test-import.json', { type: 'application/json' });
      
      const input = document.getElementById('import-file');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    });
    
    await page.waitForTimeout(200);
    
    // Закрываем модальное окно настроек
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    
    // Проверяем, что данные восстановились
    if (await todayCell.count() > 0) {
      await todayCell.click();
      await expect(page.locator('.task-item')).toHaveCount(1);
      await expect(page.locator('.task-title')).toHaveText('Обычная задача');
    }
    
    // Проверяем, что настройки тоже восстановились
    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    expect(hasDarkMode).toBe(true);
  });

  test('Проверка отображения свободного времени после операций с задачами', async ({ page }) => {
    // Выбираем день
    const day = page.locator('.calendar tbody td:not(.other-month)').first();
    await day.click();
    
    // Создаем задачу программно в середине дня
    await page.evaluate(() => {
      const task = {
        id: '1',
        type: 'single',
        title: 'Задача в середине дня',
        time: '12:00',
        duration: '120', // 2 часа
        date: new Date().toISOString().split('T')[0]
      };
      window.tasks = [task];
      window.saveTasks();
      window.displayTasksForDay(new Date());
    });
    
    // Проверяем, что есть временные слоты до и после задачи
    await expect(page.locator('.time-gap')).toHaveCount(2);
    
    // Добавляем еще одну задачу через интерфейс
    const firstGap = page.locator('.time-gap').first();
    await firstGap.click();
    
    await expect(page.locator('#taskModal')).toBeVisible();
    await page.fill('#taskTitle', 'Утренняя задача');
    await page.click('button[type="submit"]');
    
    // Проверяем, что количество задач увеличилось
    await expect(page.locator('.task-item')).toHaveCount(2);
    
    // Проверяем, что свободное время пересчиталось
    const gaps = page.locator('.time-gap');
    const gapCount = await gaps.count();
    expect(gapCount).toBeGreaterThanOrEqual(1);
    
    // Удаляем одну задачу
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    await page.locator('button:has-text("Удалить")').first().click();
    
    // Проверяем, что свободное время увеличилось
    await expect(page.locator('.task-item')).toHaveCount(1);
    const newGapCount = await page.locator('.time-gap').count();
    expect(newGapCount).toBeGreaterThanOrEqual(1);
  });

  test('Взаимодействие календаря и списка задач', async ({ page }) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Создаем задачи на два дня
    await page.evaluate(({ todayStr, tomorrowStr }) => {
      const tasks = [
        {
          id: '1',
          type: 'single',
          title: 'Задача на сегодня',
          time: '10:00',
          duration: '60',
          date: todayStr
        },
        {
          id: '2',
          type: 'single',
          title: 'Задача на завтра',
          time: '14:00',
          duration: '90',
          date: tomorrowStr
        }
      ];
      window.tasks = tasks;
      window.saveTasks();
    }, { todayStr: today.toISOString().split('T')[0], tomorrowStr: tomorrow.toISOString().split('T')[0] });
    
    // Выбираем сегодня
    const todayCell = page.locator(`[data-date="${today.toISOString().split('T')[0]}"]`);
    if (await todayCell.count() > 0) {
      await todayCell.click();
      
      // Ждем появления задач
      await page.waitForSelector('.task-item', { timeout: 5000 });
      
      // Проверяем задачу на сегодня
      await expect(page.locator('.task-item')).toHaveCount(1);
      await expect(page.locator('.task-title')).toHaveText('Задача на сегодня');
      
      // Переключаемся на завтра
      const tomorrowCell = page.locator(`[data-date="${tomorrow.toISOString().split('T')[0]}"]`);
      if (await tomorrowCell.count() > 0) {
        await tomorrowCell.click();
        
        // Ждем появления задач на завтра
        await page.waitForSelector('.task-item', { timeout: 5000 });
        
        // Проверяем задачу на завтра
        await expect(page.locator('.task-item')).toHaveCount(1);
        await expect(page.locator('.task-title')).toHaveText('Задача на завтра');
        
        // Возвращаемся к сегодня
        await todayCell.click();
        
        // Проверяем, что отображается задача на сегодня
        await expect(page.locator('.task-item')).toHaveCount(1);
        await expect(page.locator('.task-title')).toHaveText('Задача на сегодня');
      }
    }
  });
});