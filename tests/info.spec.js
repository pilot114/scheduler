const { test, expect } = require('@playwright/test');

test.describe('Планировщик - Информация', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');

    // Очищаем localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
    await page.waitForSelector('.calendar');
  });

  test('Кнопка информации присутствует', async ({ page }) => {
    await expect(page.locator('#info-btn')).toBeVisible();

    // Проверяем иконку
    const buttonText = await page.locator('#info-btn').textContent();
    expect(buttonText).toBe('ℹ️');

    // Проверяем подсказку
    const title = await page.locator('#info-btn').getAttribute('title');
    expect(title).toBe('Информация');
  });

  test('Открытие модального окна информации', async ({ page }) => {
    // Кликаем на кнопку информации
    await page.click('#info-btn');

    // Проверяем, что модальное окно открылось
    await expect(page.locator('#infoModal')).toBeVisible();
    await expect(page.locator('#infoModal h2')).toHaveText('Как использовать планировщик');
  });

  test('Модальное окно содержит основные разделы', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Проверяем наличие основных разделов
    await expect(page.locator('#infoModal h3:has-text("Основные функции")')).toBeVisible();
    await expect(page.locator('#infoModal h3:has-text("Режимы просмотра")')).toBeVisible();
    await expect(page.locator('#infoModal h3:has-text("Типы дел")')).toBeVisible();
    await expect(page.locator('#infoModal h3:has-text("Настройки")')).toBeVisible();
  });

  test('Информация о режимах просмотра присутствует', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Проверяем упоминание режимов просмотра
    const infoContent = page.locator('.info-content');
    const content = await infoContent.textContent();

    expect(content).toContain('Месяц');
    expect(content).toContain('Год');
    expect(content).toContain('📆');
    expect(content).toContain('📅');
  });

  test('Информация о настройках присутствует', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    const infoContent = page.locator('.info-content');
    const content = await infoContent.textContent();

    // Проверяем упоминание всех основных настроек
    expect(content).toContain('Шаг времени');
    expect(content).toContain('Часы на бытовые дела');
    expect(content).toContain('Тёмная тема');
    expect(content).toContain('Экспорт/Импорт');
  });

  test('Информация о типах дел присутствует', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    const infoContent = page.locator('.info-content');
    const content = await infoContent.textContent();

    expect(content).toContain('Одиночное дело');
    expect(content).toContain('Периодическое дело');
  });

  test('Информация о цветовой индикации присутствует', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    const infoContent = page.locator('.info-content');
    const content = await infoContent.textContent();

    expect(content).toContain('Цветовая индикация');
    expect(content).toContain('Красный');
    expect(content).toContain('Желтый');
  });

  test('Закрытие модального окна кликом вне его', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Кликаем вне модального окна
    await page.click('#infoModal', { position: { x: 10, y: 10 } });

    // Проверяем, что модальное окно закрылось
    await expect(page.locator('#infoModal')).not.toBeVisible();
  });

  test('Модальное окно имеет прокрутку при длинном содержимом', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Проверяем, что контент модального окна может прокручиваться
    const modalContent = page.locator('.info-modal-content');
    const overflowY = await modalContent.evaluate((el) => {
      return window.getComputedStyle(el).overflowY;
    });

    expect(overflowY).toBe('auto');
  });

  test('Повторное открытие модального окна работает', async ({ page }) => {
    // Открываем первый раз
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Закрываем
    await page.click('#infoModal button.btn-primary');
    await expect(page.locator('#infoModal')).not.toBeVisible();

    // Открываем второй раз
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Проверяем, что содержимое все еще на месте
    await expect(page.locator('#infoModal h2')).toHaveText('Как использовать планировщик');
  });

  test('Модальное окно информации не блокирует другие функции после закрытия', async ({ page }) => {
    // Открываем и закрываем модальное окно информации
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();
    await page.click('#infoModal button.btn-primary');
    await expect(page.locator('#infoModal')).not.toBeVisible();

    // Проверяем, что можно открыть настройки
    await page.click('#settings-btn');
    await expect(page.locator('#settingsModal')).toBeVisible();
  });

  test('Списки в модальном окне правильно отформатированы', async ({ page }) => {
    await page.click('#info-btn');
    await expect(page.locator('#infoModal')).toBeVisible();

    // Проверяем наличие списков
    const lists = page.locator('.info-content ul');
    const listCount = await lists.count();

    // Должно быть несколько списков (по одному на каждый раздел)
    expect(listCount).toBeGreaterThan(3);

    // Проверяем наличие элементов списка
    const listItems = page.locator('.info-content li');
    const itemCount = await listItems.count();

    // Должно быть много элементов списка
    expect(itemCount).toBeGreaterThan(10);
  });
});
