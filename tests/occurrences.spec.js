const { test, expect } = require('@playwright/test');

// Editing single occurrences of a recurring task
test.describe('Планировщик - Изменение повторяющегося дела в конкретный день', () => {
  const DAY = '2026-10-07';
  const OTHER_DAY = '2026-10-08';

  const work = {
    id: 'work',
    type: 'recurring',
    title: 'Работа',
    time: '09:00',
    duration: '540',
    description: '',
    recurringType: 'daily',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    hideFromCalendar: false,
  };

  async function setRange(page, selector, value) {
    await page.evaluate(
      ([selector, value]) => {
        const input = document.querySelector(selector);
        input.value = value;
        input.dispatchEvent(new Event('input'));
      },
      [selector, value],
    );
  }

  async function openDay(page, date) {
    await page.evaluate((date) => selectDate(date), date);
  }

  const items = (page) => page.locator('#taskList .task-item:not(.skipped)');

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate((task) => {
      localStorage.clear();
      localStorage.setItem('tasks', JSON.stringify([task]));
    }, work);
    await page.reload();
    await page.waitForSelector('.calendar');
    await openDay(page, DAY);
  });

  test('Сдвиг времени только в этот день', async ({ page }) => {
    await items(page).first().locator('button:has-text("Редактировать")').click();

    await expect(page.locator('input[name="editScope"][value="day"]')).toBeChecked();
    await expect(page.locator('#taskTitle')).toBeHidden();
    await expect(page.locator('#recurringOptions')).toBeHidden();

    await setRange(page, '#taskTime', 600);
    await setRange(page, '#taskDuration', 420);
    await page.click('#taskModal button[type="submit"]');

    await expect(items(page).first().locator('.task-time')).toContainText('10:00 7 ч');
    await expect(items(page).first().locator('.occurrence-modified')).toBeVisible();

    await openDay(page, OTHER_DAY);
    await expect(items(page).first().locator('.task-time')).toContainText('09:00 9 ч');
    await expect(page.locator('.occurrence-modified')).toHaveCount(0);
  });

  test('Режим "Вся серия" показывает все поля', async ({ page }) => {
    await items(page).first().locator('button:has-text("Редактировать")').click();
    await page.click('.scope-switch span:has-text("Вся серия")');

    await expect(page.locator('#taskTitle')).toBeVisible();
    await expect(page.locator('#recurringOptions')).toBeVisible();
    await expect(page.locator('#taskTime')).toHaveValue('540');
  });

  test('Удаление только в этот день и возврат', async ({ page }) => {
    await items(page).first().locator('button:has-text("Удалить")').click();
    await page.click('#deleteModal button:has-text("Только этот день")');

    await expect(items(page)).toHaveCount(0);
    await expect(page.locator('.task-item.skipped')).toContainText('Работа');

    await openDay(page, OTHER_DAY);
    await expect(items(page)).toHaveCount(1);

    await openDay(page, DAY);
    await page.click('.task-item.skipped .occurrence-reset');
    await expect(items(page)).toHaveCount(1);
    await expect(page.locator('.task-item.skipped')).toHaveCount(0);
  });

  test('Удаление всей серии', async ({ page }) => {
    await items(page).first().locator('button:has-text("Удалить")').click();
    await page.click('#deleteModal button:has-text("Всю серию")');

    await expect(page.locator('#taskList .task-item')).toHaveCount(0);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tasks')));
    expect(stored).toHaveLength(0);
  });

  test('Вставка дела в середину', async ({ page }) => {
    await items(page).first().locator('button:has-text("Вставить")').click();
    await expect(page.locator('#modalTitle')).toHaveText('Вставить в «Работа»');
    await expect(page.locator('#taskRecurringGroup')).toBeHidden();

    await page.fill('#taskTitle', 'Врач');
    await setRange(page, '#taskTime', 780);
    await setRange(page, '#taskDuration', 60);
    await page.click('#taskModal button[type="submit"]');

    await expect(items(page)).toHaveCount(3);
    await expect(items(page).nth(0)).toContainText('09:00 4 ч');
    await expect(items(page).nth(1)).toContainText('Врач');
    await expect(items(page).nth(1)).toContainText('13:00 1 ч');
    await expect(items(page).nth(2)).toContainText('14:00 4 ч');

    // Removing the inserted part of the split occurrence keeps the rest
    await items(page).nth(2).locator('button:has-text("Удалить")').click();
    await page.click('#deleteModal button:has-text("Только этот день")');
    await expect(items(page)).toHaveCount(2);

    await openDay(page, OTHER_DAY);
    await expect(items(page)).toHaveCount(1);
  });

  test('Изменение серии сохраняет правки отдельных дней', async ({ page }) => {
    await items(page).first().locator('button:has-text("Редактировать")').click();
    await setRange(page, '#taskTime', 600);
    await setRange(page, '#taskDuration', 60);
    await page.click('#taskModal button[type="submit"]');

    await openDay(page, OTHER_DAY);
    await items(page).first().locator('button:has-text("Редактировать")').click();
    await page.click('.scope-switch span:has-text("Вся серия")');
    await page.fill('#taskTitle', 'Офис');
    await page.click('#taskModal button[type="submit"]');

    await expect(items(page).first()).toContainText('Офис');
    await openDay(page, DAY);
    await expect(items(page).first()).toContainText('Офис');
    await expect(items(page).first().locator('.task-time')).toContainText('10:00 1 ч');
  });

  test('Правка дня не может пересечься с другим делом', async ({ page }) => {
    await page.evaluate(() => {
      tasks.push({
        id: 'lunch',
        type: 'single',
        title: 'Обед',
        date: '2026-10-07',
        time: '18:30',
        duration: '60',
        description: '',
      });
      saveTasks();
      selectDate('2026-10-07');
    });

    let message = '';
    page.on('dialog', async (dialog) => {
      message = dialog.message();
      await dialog.accept();
    });

    await items(page).first().locator('button:has-text("Редактировать")').click();
    await setRange(page, '#taskTime', 600);
    await page.click('#taskModal button[type="submit"]');

    expect(message).toContain('Обед');
    await expect(page.locator('#taskModal')).toBeVisible();
  });
});
