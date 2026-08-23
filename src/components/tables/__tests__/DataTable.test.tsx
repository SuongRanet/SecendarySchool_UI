import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { DataTable } from '../DataTable';
import type { Column } from '../DataTable';

interface Row {
  id: number;
  name: string;
  code: string;
}

const rows: Row[] = [
  { id: 1, name: 'Dara Chan', code: 'S001' },
  { id: 2, name: 'Sophea Sok', code: 'S002' },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name, sortable: true },
  { key: 'code', header: 'Code', render: (row) => row.code },
];

const renderTable = (props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) =>
  renderWithProviders(
    <DataTable<Row> columns={columns} rows={rows} rowKey={(row) => row.id} {...props} />,
  );

describe('DataTable', () => {
  it('renders a header for every column and a row for every record', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /code/i })).toBeInTheDocument();
    expect(screen.getByText('Dara Chan')).toBeInTheDocument();
    expect(screen.getByText('S002')).toBeInTheDocument();
  });

  it('shows the empty state instead of an empty table', () => {
    renderTable({ rows: [], emptyTitle: 'No students yet' });

    expect(screen.getByText('No students yet')).toBeInTheDocument();
    expect(screen.queryByText('Dara Chan')).not.toBeInTheDocument();
  });

  it('shows the error state and offers a retry', async () => {
    const onRetry = vi.fn();
    renderTable({ error: 'Could not load students', onRetry });

    expect(screen.getByText('Could not load students')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render the rows while loading', () => {
    renderTable({ isLoading: true });

    expect(screen.queryByText('Dara Chan')).not.toBeInTheDocument();
  });

  it('asks for an ascending sort the first time a sortable header is clicked', async () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange });

    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /name/i })).getByRole('button'),
    );

    expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
  });

  it('reverses the direction when the active sort column is clicked again', async () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange, sort: { sortBy: 'name', sortOrder: 'asc' } });

    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /name/i })).getByRole('button'),
    );

    expect(onSortChange).toHaveBeenCalledWith('name', 'desc');
  });

  it('does not make a non-sortable column clickable', () => {
    renderTable({ onSortChange: vi.fn() });

    expect(
      within(screen.getByRole('columnheader', { name: /code/i })).queryByRole('button'),
    ).toBeNull();
  });

  it('reports the clicked row', async () => {
    const onRowClick = vi.fn();
    renderTable({ onRowClick });

    await userEvent.click(screen.getByText('Dara Chan'));

    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
