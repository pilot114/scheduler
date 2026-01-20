const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Настройки', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    
    // Очищаем localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
  });

  test('Открытие модального окна настроек', async ({ page }) => {
    // Кликаем на кнопку настроек
    await page.click('#settings-btn');
    
    // Проверяем, что модальное окно настроек открылось
    await expect(page.locator('#settingsModal')).toBeVisible();
    await expect(page.locator('#settingsModal h2')).toHaveText('Настройки');
    
    // Проверяем основные элементы настроек
    await expect(page.locator('input[name="step"]')).toHaveCount(5);
    await expect(page.locator('#theme-toggle-modal')).toBeAttached();
    await expect(page.locator('#notifyButton-modal')).toBeVisible();
    await expect(page.locator('#export-btn')).toBeVisible();
    await expect(page.locator('#import-btn')).toBeVisible();
  });

  test('Закрытие модального окна настроек', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // Закрываем кликом вне модального окна
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    await expect(page.locator('#settingsModal')).not.toBeVisible();
  });

  test('Изменение шага выбора времени', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // По умолчанию должен быть выбран шаг 10 минут
    await expect(page.locator('input[name="step"][value="10"]')).toBeChecked();
    
    // Выбираем шаг 15 минут
    await page.evaluate(() => {
      const radio = document.querySelector('input[name="step"][value="15"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    });
    
    // Закрываем модальное окно
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    
    // Проверяем, что настройка сохранилась
    const savedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });
    
    expect(savedSettings.step).toBe(15);
    
    // Открываем настройки снова и проверяем сохранение
    await page.click('#settings-btn');
    await expect(page.locator('input[name="step"][value="15"]')).toBeChecked();
  });

  test('Переключение темной темы', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // По умолчанию темная тема выключена
    await expect(page.locator('#theme-toggle-modal')).not.toBeChecked();
    
    // Включаем темную тему
    await page.evaluate(() => {
      const checkbox = document.querySelector('#theme-toggle-modal');
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('click', { bubbles: true }));
    });
    
    // Проверяем, что класс dark-mode добавился к документу
    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    expect(hasDarkMode).toBe(true);
    
    // Закрываем модальное окно
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    
    // Проверяем сохранение настройки
    const savedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });
    expect(savedSettings.theme).toBe('dark-mode');
    
    // Выключаем темную тему
    await page.click('#settings-btn');
    await page.evaluate(() => {
      const checkbox = document.querySelector('#theme-toggle-modal');
      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      checkbox.dispatchEvent(new Event('click', { bubbles: true }));
    });
    
    const hasLightMode = await page.evaluate(() => {
      return !document.documentElement.classList.contains('dark-mode');
    });
    expect(hasLightMode).toBe(true);
  });

  test('Экспорт данных', async ({ page }) => {
    // Создаем тестовые данные
    await page.evaluate(() => {
      const tasks = [
        {
          id: '1',
          type: 'single',
          title: 'Тестовая задача',
          time: '10:00',
          duration: '60',
          date: new Date().toISOString().split('T')[0]
        }
      ];
      localStorage.setItem('tasks', JSON.stringify(tasks));
    });
    
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // Настраиваем перехват загрузки файла
    const downloadPromise = page.waitForEvent('download');
    
    // Кликаем кнопку экспорта
    await page.click('#export-btn');
    
    // Ждем загрузку файла
    const download = await downloadPromise;
    
    // Проверяем имя файла
    expect(download.suggestedFilename()).toBe('tasks-backup.json');
  });

  test('Импорт данных', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // Создаем тестовый файл с данными
    const testData = {
      tasks: [
        {
          id: '1',
          type: 'single',
          title: 'Импортированная задача',
          time: '14:00',
          duration: '90',
          date: new Date().toISOString().split('T')[0]
        }
      ],
      settings: {
        step: 30,
        theme: 'dark-mode',
        notifications: true
      }
    };
    
    // Настраиваем обработку диалога успешного импорта
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('успешно импортированы');
      await dialog.accept();
    });
    
    // Создаем файл для импорта
    await page.evaluate((data) => {
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const file = new File([blob], 'test-import.json', { type: 'application/json' });
      
      // Имитируем выбор файла
      const input = document.getElementById('import-file');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      // Запускаем событие change
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }, testData);
    
    // Ждем завершения импорта
    await page.waitForTimeout(100);
    
    // Проверяем, что данные импортировались
    const importedTasks = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('tasks'));
    });
    
    expect(importedTasks).toHaveLength(1);
    expect(importedTasks[0].title).toBe('Импортированная задача');
    
    const importedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });
    
    expect(importedSettings.step).toBe(30);
    expect(importedSettings.theme).toBe('dark-mode');
  });

  test('Импорт неверного формата файла', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    // Настраиваем обработку диалога с ошибкой
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Неверный формат');
      await dialog.accept();
    });
    
    // Создаем файл с неверным форматом
    await page.evaluate(() => {
      const invalidData = { invalidProperty: 'test' };
      const blob = new Blob([JSON.stringify(invalidData)], { type: 'application/json' });
      const file = new File([blob], 'invalid.json', { type: 'application/json' });
      
      const input = document.getElementById('import-file');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    });
    
    await page.waitForTimeout(100);
  });

  test('Применение настроек после загрузки страницы', async ({ page }) => {
    // Устанавливаем настройки программно
    await page.evaluate(() => {
      const settings = {
        step: 30,
        theme: 'dark-mode',
        notifications: false
      };
      localStorage.setItem('settings', JSON.stringify(settings));
    });
    
    // Перезагружаем страницу
    await page.reload();
    await page.waitForSelector('.calendar');
    
    // Проверяем, что темная тема применилась
    const hasDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark-mode');
    });
    expect(hasDarkMode).toBe(true);
    
    // Проверяем, что настройки отражены в модальном окне
    await page.click('#settings-btn');
    await expect(page.locator('input[name="step"][value="30"]')).toBeChecked();
    await expect(page.locator('#theme-toggle-modal')).toBeChecked();
  });

  test('Все опции шага времени доступны', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    const expectedSteps = ['5', '10', '15', '30', '60'];
    
    for (const step of expectedSteps) {
      const radio = page.locator(`input[name="step"][value="${step}"]`);
      await expect(radio).toBeAttached();
      
      // Проверяем, что радиокнопку можно выбрать
      await page.evaluate((step) => {
        const radio = document.querySelector(`input[name="step"][value="${step}"]`);
        radio.checked = true;
        radio.click();
      }, step);
      await expect(radio).toBeChecked();
    }
  });

  test('Кнопка уведомлений изменяется в зависимости от поддержки', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
    
    const notifyButton = page.locator('#notifyButton-modal');
    await expect(notifyButton).toBeVisible();
    
    // Проверяем текст кнопки
    const buttonText = await notifyButton.textContent();
    expect(buttonText).toMatch(/(Включить уведомления|Уведомления включены|Уведомления не поддерживаются)/);
  });

  test('Сохранение настроек происходит мгновенно', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();

    // Элементы настроек должны быть в DOM
    await expect(page.locator('input[name="step"][value="5"]')).toBeAttached();

    // Изменяем настройку
    await page.evaluate(() => {
      const radio = document.querySelector('input[name="step"][value="5"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    });

    // Сразу проверяем localStorage без закрытия модального окна
    const savedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });

    expect(savedSettings.step).toBe(5);
  });

  test('Изменение настройки часов на бытовые дела', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();

    // По умолчанию должно быть выбрано 8 часов
    await expect(page.locator('input[name="dailyHours"][value="8"]')).toBeChecked();

    // Выбираем 4 часа
    await page.evaluate(() => {
      const radio = document.querySelector('input[name="dailyHours"][value="4"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    });

    // Проверяем, что настройка сохранилась
    const savedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });

    expect(savedSettings.dailyHours).toBe(4);

    // Закрываем и снова открываем настройки
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });
    await page.click('#settings-btn');

    // Проверяем, что выбрано 4 часа
    await expect(page.locator('input[name="dailyHours"][value="4"]')).toBeChecked();
  });

  test('Все опции часов на бытовые дела доступны', async ({ page }) => {
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();

    const expectedHours = ['0', '2', '4', '6', '8'];

    for (const hours of expectedHours) {
      const radio = page.locator(`input[name="dailyHours"][value="${hours}"]`);
      await expect(radio).toBeAttached();

      // Проверяем, что радиокнопку можно выбрать
      await page.evaluate((hours) => {
        const radio = document.querySelector(`input[name="dailyHours"][value="${hours}"]`);
        radio.checked = true;
        radio.click();
      }, hours);
      await expect(radio).toBeChecked();
    }
  });

  test('Настройка часов на бытовые дела влияет на свободные часы', async ({ page }) => {
    // Устанавливаем 0 часов на бытовые дела
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();

    await page.evaluate(() => {
      const radio = document.querySelector('input[name="dailyHours"][value="0"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    });

    await page.waitForTimeout(500);
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });

    // Получаем свободные часы для дня без задач
    const freeHours0 = await page.evaluate(() => {
      const today = new Date();
      const cell = document.querySelector(`[data-date="${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}"]`);
      const freeHoursDiv = cell ? cell.querySelector('.free-hours') : null;
      return freeHoursDiv ? freeHoursDiv.textContent : null;
    });

    // Устанавливаем 8 часов на бытовые дела
    await page.click('#settings-btn');
    await page.evaluate(() => {
      const radio = document.querySelector('input[name="dailyHours"][value="8"]');
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
      radio.dispatchEvent(new Event('click', { bubbles: true }));
    });

    await page.waitForTimeout(500);
    await page.click('#settingsModal', { position: { x: 10, y: 10 } });

    // Получаем свободные часы после изменения настройки
    const freeHours8 = await page.evaluate(() => {
      const today = new Date();
      const cell = document.querySelector(`[data-date="${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}"]`);
      const freeHoursDiv = cell ? cell.querySelector('.free-hours') : null;
      return freeHoursDiv ? freeHoursDiv.textContent : null;
    });

    // Проверяем, что разница в свободных часах составляет 8 часов
    if (freeHours0 && freeHours8) {
      const hours0 = parseInt(freeHours0.replace('h', ''));
      const hours8 = parseInt(freeHours8.replace('h', ''));
      expect(hours0 - hours8).toBe(8);
    }
  });
});