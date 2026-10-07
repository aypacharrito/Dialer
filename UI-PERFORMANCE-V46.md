# Pacifica V46

The saved appearance and text size apply before the first page paint. New
workspaces start in dark mode; a saved light preference remains light. The
loading screen keeps that appearance while the cloud workspace loads or retries.

The installed desktop app also remembers its native window appearance. This
part requires the new desktop release after pushing the source update; a web
deployment alone cannot replace an already installed desktop executable.

Dialer panels use one layout per workspace across both appearances. The first
open migrates the layout for the active appearance, or the other appearance if
necessary. Previous layout records remain available. Theme switches keep panel
positions, editing state and call controls mounted.

The sidebar restores its saved width before hydration and removes the language
control when collapsed. Inter is preloaded locally for controls and body text;
Manrope supplies headings and branding. The light Pacifica mark centers in the
workspace below the header, and narrow keypad headers wrap their controls.

## Performance changes

- Contacts only filters and builds its table while the Contacts page is open.
  Pages contain up to 100 rows. Search, filters and CSV export still include all
  matching contacts. Changing the search or filters returns to the first page.
- Startup duplicate checks index phone, email, provider identity and address
  instead of repeatedly scanning all earlier contacts. The earliest matching
  record and existing merge behavior are preserved; changed identities are
  removed from the index.
- Upcoming dialer contacts stop scanning after finding the next three entries.
- Local saves coalesce for 600 ms instead of serializing every contact during
  each interaction. Closing the page or unmounting flushes pending local changes.
  The separate, small appearance cache updates immediately.
- The starfield reuses measured coordinates during pointer movement. Background
  frames continue to pause when hidden or when reduced motion is requested.

## Verification

On this execution machine, checking 5,000 unique synthetic contacts took about
7,209 ms with the previous implementation and a median of 5 ms across five runs
with the new one. This measures duplicate checking, not total startup or network
latency. Eighty mixed duplicate datasets produced identical results with both
implementations. A separate 10,000-contact regression verifies bounded identity
reads, without relying on a fragile timing threshold.

UI regressions cover 5,000-contact pagination, searching an offscreen contact,
exporting all 5,000 contacts, retaining panel identity across theme switches,
loading a cached appearance after a cloud failure, restoring sidebar controls,
and flushing local changes before close. Native window tests cover first launch,
saved appearance across relaunches, and rejection of untrusted theme messages.

Video audio was reviewed with local speech transcription and the supplied
screenshots were inspected. Providers are mocked in automated checks; no paid AI
requests or live customer calls are used. Browser automation could not run here
because the Chromium download was unavailable. Visual placement should receive a
final check on the installed Windows app. Device speed, server work and network
conditions still contribute to latency.

## Primary references consulted

- [Vercel: preventing flash before hydration](https://github.com/vercel-labs/preventing-flash-before-hydration)
- [React: deferred rendering](https://react.dev/reference/react/useDeferredValue)
- [React: profiling rendering](https://react.dev/reference/react/Profiler)
