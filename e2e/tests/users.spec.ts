import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

/**
 * E2E tests for User Management CRUD operations
 *
 * These tests cover the happy paths for:
 * - Viewing the users list
 * - Creating a new user
 * - Editing an existing user
 * - Deleting a user
 *
 * All tests run as an admin user since user management is admin-only.
 */

async function createUser(
  page: Page,
  overrides?: { name?: string; email?: string; password?: string }
) {
  const timestamp = Date.now();
  const name = overrides?.name ?? `Test Agent ${timestamp}`;
  const email = overrides?.email ?? `agent${timestamp}@example.com`;
  const password = overrides?.password ?? 'password123';

  await page.getByRole('button', { name: /new user/i }).click();
  await page.getByLabel(/^name$/i).fill(name);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /create user/i }).click();

  await expect(
    page.getByRole('cell', { name: email, exact: true })
  ).toBeVisible();

  return { name, email, password };
}

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsAdmin(page);
    // Navigate to the users page
    await page.goto('/users');
  });

  test('should display the seeded admin user', async ({ page }) => {
    const adminRow = page
      .getByRole('row')
      .filter({ hasText: 'admin@example.com' });
    await expect(adminRow).toBeVisible();
    await expect(adminRow).toContainText('Admin');
    await expect(adminRow).toContainText('admin');
  });

  test.describe('Create User', () => {
    test("should open create user dialog when clicking 'New User'", async ({
      page,
    }) => {
      // Click "New User" button
      await page.getByRole('button', { name: /new user/i }).click();

      // Dialog should be visible
      await expect(
        page.getByRole('heading', { name: /^create user$/i })
      ).toBeVisible();

      // Form fields should be visible
      await expect(page.getByLabel(/^name$/i)).toBeVisible();
      await expect(page.getByLabel(/^email$/i)).toBeVisible();
      await expect(page.getByLabel(/^password$/i)).toBeVisible();

      // Submit button should be visible
      await expect(
        page.getByRole('button', { name: /create user/i })
      ).toBeVisible();
    });

    test('should create a new agent user successfully', async ({ page }) => {
      // Verify we're on the users page and logged in
      await expect(page).toHaveURL('/users');
      await expect(
        page.getByRole('heading', { name: /^users$/i })
      ).toBeVisible();

      // Click "New User" button
      await page.getByRole('button', { name: /new user/i }).click();

      // Fill in the form
      const timestamp = Date.now();
      const userName = `Test Agent ${timestamp}`;
      const userEmail = `agent${timestamp}@example.com`;
      const userPassword = 'password123';

      await page.getByLabel(/^name$/i).fill(userName);
      await page.getByLabel(/^email$/i).fill(userEmail);
      await page.getByLabel(/^password$/i).fill(userPassword);

      // Submit the form
      await page.getByRole('button', { name: /create user/i }).click();

      // Wait for the new user to appear in the table
      await expect(
        page.getByRole('cell', { name: userEmail, exact: true })
      ).toBeVisible();

      // Verify user details are correct
      const newUserRow = page.getByRole('row').filter({ hasText: userEmail });
      await expect(newUserRow).toContainText(userName);
      await expect(newUserRow).toContainText(userEmail);

      // New user should have "agent" role (default)
      await expect(newUserRow).toContainText('agent');

      // New agent user should have both edit and delete buttons
      await expect(
        newUserRow.getByRole('button', {
          name: new RegExp(`edit ${userName}`, 'i'),
        })
      ).toBeVisible();
      await expect(
        newUserRow.getByRole('button', {
          name: new RegExp(`delete ${userName}`, 'i'),
        })
      ).toBeVisible();
    });
  });

  test.describe('Edit User', () => {
    test('should open edit user dialog when clicking edit button', async ({
      page,
    }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`edit ${user.name}`, 'i'),
        })
        .click();

      // Edit dialog should be visible
      await expect(
        page.getByRole('heading', { name: /^edit user$/i })
      ).toBeVisible();

      // Form fields should be pre-populated
      await expect(page.getByLabel(/^name$/i)).toHaveValue(user.name);
      await expect(page.getByLabel(/^email$/i)).toHaveValue(user.email);

      // Password field should be empty (with placeholder text)
      await expect(page.getByLabel(/^password$/i)).toHaveValue('');
      await expect(page.getByLabel(/^password$/i)).toHaveAttribute(
        'placeholder',
        /leave blank to keep current/i
      );

      // Submit button should say "Save Changes"
      await expect(
        page.getByRole('button', { name: /save changes/i })
      ).toBeVisible();
    });

    test('should edit user name successfully', async ({ page }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`edit ${user.name}`, 'i'),
        })
        .click();

      const newName = `Updated Name ${Date.now()}`;
      await page.getByLabel(/^name$/i).clear();
      await page.getByLabel(/^name$/i).fill(newName);

      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(
        page.getByRole('cell', { name: newName, exact: true })
      ).toBeVisible();
      await expect(page.getByText(user.name)).not.toBeVisible();
    });

    test('should edit user email successfully', async ({ page }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`edit ${user.name}`, 'i'),
        })
        .click();

      const newEmail = `updatedemail${Date.now()}@example.com`;
      await page.getByLabel(/^email$/i).clear();
      await page.getByLabel(/^email$/i).fill(newEmail);

      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(
        page.getByRole('cell', { name: newEmail, exact: true })
      ).toBeVisible();
      await expect(page.getByText(user.email)).not.toBeVisible();
    });

    test('should edit user name and email together', async ({ page }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`edit ${user.name}`, 'i'),
        })
        .click();

      const timestamp = Date.now();
      const newName = `Updated Both ${timestamp}`;
      const newEmail = `updatedboth${timestamp}@example.com`;

      await page.getByLabel(/^name$/i).clear();
      await page.getByLabel(/^name$/i).fill(newName);
      await page.getByLabel(/^email$/i).clear();
      await page.getByLabel(/^email$/i).fill(newEmail);

      await page.getByRole('button', { name: /save changes/i }).click();

      await expect(
        page.getByRole('cell', { name: newEmail, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: newName, exact: true })
      ).toBeVisible();

      await expect(page.getByText(user.name)).not.toBeVisible();
      await expect(page.getByText(user.email)).not.toBeVisible();
    });
  });

  test.describe('Delete User', () => {
    test('should open delete confirmation dialog when clicking delete button', async ({
      page,
    }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`delete ${user.name}`, 'i'),
        })
        .click();

      await expect(
        page.getByRole('heading', { name: /^delete user$/i })
      ).toBeVisible();

      await expect(
        page.getByText(
          new RegExp(`are you sure you want to delete ${user.name}`, 'i')
        )
      ).toBeVisible();

      await expect(
        page.getByRole('button', { name: /^cancel$/i })
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /^confirm$/i })
      ).toBeVisible();
    });

    test('should cancel deletion when clicking Cancel', async ({ page }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`delete ${user.name}`, 'i'),
        })
        .click();

      await page.getByRole('button', { name: /^cancel$/i }).click();

      // User should still be present in the table
      await expect(
        page.getByRole('cell', { name: user.email, exact: true })
      ).toBeVisible();
      await expect(
        page.getByRole('cell', { name: user.name, exact: true })
      ).toBeVisible();
    });

    test('should delete user successfully when clicking Confirm', async ({
      page,
    }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await userRow
        .getByRole('button', {
          name: new RegExp(`delete ${user.name}`, 'i'),
        })
        .click();

      await page.getByRole('button', { name: /^confirm$/i }).click();

      await expect(
        page.getByRole('cell', { name: user.email, exact: true })
      ).not.toBeVisible();
      await expect(page.getByText(user.name)).not.toBeVisible();
    });

    test('should not show delete button for admin user', async ({ page }) => {
      const adminRow = page
        .getByRole('row')
        .filter({ hasText: 'admin@example.com' });
      await expect(adminRow).toBeVisible();
      await expect(
        adminRow.getByRole('button', { name: /delete/i })
      ).not.toBeVisible();
    });

    test('should show delete button for agent users only', async ({ page }) => {
      const user = await createUser(page);
      const userRow = page.getByRole('row').filter({ hasText: user.email });

      await expect(
        userRow.getByRole('button', {
          name: new RegExp(`delete ${user.name}`, 'i'),
        })
      ).toBeVisible();
    });
  });
});
