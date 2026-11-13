import { test, expect } from '@playwright/test';

test('demo → lesson → reflection → memory edit → quiz → review card, no console errors', async ({ page }, info) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A tutor that/ })).toBeVisible();
  await page.screenshot({ path: `test-results/landing-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByTestId('sessions')).toContainText('Statistics basics');

  await page.getByRole('button', { name: 'Statistics basics', exact: true }).click();
  await page.getByLabel('Message').fill('When should I use the median?');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByTestId('chat')).toContainText('you like those');
  await expect(page.getByText(/Using \d+ things I know about you/)).toBeVisible();
  await page.getByRole('button', { name: 'Finish and remember' }).click();
  await expect(page.getByTestId('reflection')).toContainText('Now sorts numbers before finding the median');
  await page.screenshot({ path: `test-results/lesson-${info.project.name}.png`, fullPage: true });

  await page.getByRole('button', { name: 'Memory' }).last().click();
  await expect(page.getByTestId('memories')).toContainText('Likes cricket examples');
  await page.getByRole('button', { name: 'Edit: Likes cricket examples.' }).click();
  await page.getByLabel('Edit memory').fill('Likes cricket and football examples.');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('memories')).toContainText('written by you');
  await page.screenshot({ path: `test-results/memory-${info.project.name}.png`, fullPage: true });

  await page.getByRole('button', { name: 'Practice' }).last().click();
  await page.getByRole('button', { name: 'Start a quiz' }).click();
  for (let i = 0; i < 3; i++) {
    await page.getByTestId('quiz').getByRole('listitem').first().getByRole('button').click();
    await page.getByRole('button', { name: /Next|See score/ }).click();
  }
  await expect(page.getByTestId('quiz-score')).toContainText('You got');
  await page.getByRole('button', { name: 'Review cards' }).click();
  await page.getByRole('button', { name: 'Show answer' }).click();
  await page.getByRole('button', { name: 'Good' }).click();
  await page.screenshot({ path: `test-results/practice-${info.project.name}.png`, fullPage: true });

  expect(errors).toEqual([]);
});
