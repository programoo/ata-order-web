import { useState, type FormEvent } from 'react';
import { PERIOD_OPTIONS, STATUS_OPTIONS } from '../constants/filters';
import type { OrderSearchCriteria } from '../types/order';

interface Props {
  initial: OrderSearchCriteria;
  onSearch: (criteria: OrderSearchCriteria) => void;
  isSearching: boolean;
  resultCount?: number;
}

export function SearchBar({ initial, onSearch, isSearching, resultCount }: Props) {
  /**
   * DRAFT state. The user is free to fiddle with these without triggering
   * anything. Only `onSearch` promotes them to committed criteria in the
   * parent, which is what the React Query key watches.
   *
   * Get this wrong — lift every field straight to the parent — and each
   * keystroke in a date input fires a network request.
   */
  const [draft, setDraft] = useState<OrderSearchCriteria>(initial);

  const invalidRange = draft.from > draft.to;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (invalidRange) return;
    onSearch(draft);
  }

  return (
    // A real <form> gives you Enter-to-submit for free, and screen readers
    // announce it as a search region.
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <div className="search-bar__title">
        <h1>Search</h1>
        <p className="search-bar__count">
          Search results : {resultCount ?? '—'}
        </p>
      </div>

      <div className="search-bar__filters">
        <label className="field">
          <span className="field__label">Period</span>
          <select
            value={draft.period}
            onChange={(e) => setDraft({ ...draft, period: e.target.value as never })}
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Status</span>
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as never })}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">From</span>
          <input
            type="date"
            value={draft.from}
            max={draft.to}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>

        <label className="field">
          <span className="field__label">To</span>
          <input
            type="date"
            value={draft.to}
            min={draft.from}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>

        <button type="submit" className="btn btn--primary" disabled={invalidRange || isSearching}>
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {invalidRange && (
        <p className="search-bar__error" role="alert">
          “From” date must be on or before “To” date.
        </p>
      )}
    </form>
  );
}
