import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { Modal } from '../Modal';

/**
 * Nearly every page opens a modal with an inline `onClose`, which is a new
 * function on each render. The focus effect used to depend on that identity, so
 * typing one character re-ran it and dropped focus on the close button. These
 * tests pin the behaviour a person actually notices: you can keep typing.
 */
const Host = () => {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState('');

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Enroll student">
      <input
        aria-label="Student search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
    </Modal>
  );
};

describe('Modal', () => {
  it('keeps focus in the field while the user types, rather than jumping to the close button', async () => {
    renderWithProviders(<Host />);

    const field = screen.getByLabelText('Student search');
    await userEvent.click(field);
    await userEvent.type(field, 'Dara');

    expect(field).toHaveValue('Dara');
    expect(field).toHaveFocus();
  });

  it('moves focus into the dialog when it opens', async () => {
    renderWithProviders(<Host />);

    await waitFor(() => {
      expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    });
  });

  it('closes on Escape', async () => {
    renderWithProviders(<Host />);

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
