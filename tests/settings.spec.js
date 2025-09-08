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
    await expect(page.locator('#theme-toggle-modal')).toBeVisible();
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
    await page.check('input[name="step"][value="15"]');
    
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
    
    // Ждем появления элементов внутри модального окна
    await page.waitForSelector('#theme-toggle-modal', { state: 'visible' });
    
    // По умолчанию темная тема выключена
    await expect(page.locator('#theme-toggle-modal')).not.toBeChecked();
    
    // Включаем темную тему
    await page.check('#theme-toggle-modal', { force: true });
    
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
    await page.uncheck('#theme-toggle-modal');
    
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
      await expect(radio).toBeVisible();
      
      // Проверяем, что радиокнопку можно выбрать
      await radio.check();
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
    
    // Ждем появления элементов настроек
    await page.waitForSelector('input[name="step"][value="5"]', { state: 'visible' });
    
    // Изменяем настройку
    await page.check('input[name="step"][value="5"]', { force: true });
    
    // Сразу проверяем localStorage без закрытия модального окна
    const savedSettings = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('settings'));
    });
    
    expect(savedSettings.step).toBe(5);
  });
});