# Question pagination

Use either endpoint with the same cursor parameters:

- All questions: `GET /api/v1/questions?pageSize=20`
- Selected journeys: `GET /api/v1/questions/journeys?journeys=destination&pageSize=20`
- Multiple journeys: repeat `journeys`, for example `journeys=destination&journeys=resolve`.

Both endpoints sort by `_id` ascending. Send the previous response's `next_cursor`
as `lastId` on the next request, keeping the same journey filter and page size.
Omitting `lastId` or sending an empty string starts at the beginning.

The all endpoint keeps its `questions` array. The journey endpoint keeps its
`titles` array. Both return:

| Field | Meaning |
| --- | --- |
| `entries_per_page` | Requested page size; default 20, allowed range 1–100 |
| `total_results` | Number matching the journey filter, independent of the cursor |
| `last_id` | Last document returned; null for an empty page |
| `has_more` | Whether another document exists after this page |
| `next_cursor` | Cursor for the next request; null when the list is complete |

Stop loading when `has_more` is false. A final page can be shorter than the page
size, exactly the page size, or empty. The backend fetches one extra document to
distinguish those cases. A malformed cursor or page size receives HTTP 400;
database failures receive HTTP 500 so the client can retry the same cursor.
A valid ObjectId need not still exist: it remains an exclusive ordering boundary.

For scroll restoration, the client should retain its loaded questions, current
filter, next cursor, completion state, and scroll position. Returning to the list
should reuse that state. Backend pagination does not preserve UI state itself.

The cursor follows the collection's current contents, rather than a frozen
snapshot. Deleting a previous question does not shift the cursor. Documents
inserted with IDs before an already consumed cursor appear after refreshing the
list; documents inserted after it can appear on later pages.

With MongoDB and the API running in the user's foreground terminal, run:

```sh
node scripts/check-pagination.js
```

This reads the live API and database, checks every journey against the sorted
database IDs, and checks retries, partial/exact final pages, bounds, and cursors.
It does not change data or start a server. The older `test/` suite still targets
the removed MFlix movie DAO and is not the question pagination test suite.
