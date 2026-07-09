# MEDISYNC — Performance Budget

## Hard Limits

| Metric | Limit | Enforcement |
|--------|:-----:|-------------|
| DOM nodes per table | **≤200** | Virtual scroll ensures constant |
| Initial data payload | **≤100KB** | Server pagination (50 rows × ~2KB) |
| JavaScript bundle (table) | **≤15KB** gzipped | Tree-shaking, code splitting |
| Search delay | **≤300ms** debounce | Client constant |
| Total page memory | **≤100MB** | Virtual render + pagination |

## Dataset Size Budgets

| Rows | Time to Interactive | Render Time | DOM Nodes | Memory |
|:----:|:------------------:|:----------:|:---------:|:------:|
| 100 | <500ms | <50ms | <200 | <15MB |
| 1,000 | <800ms | <50ms | <200 | <20MB |
| 5,000 | <1s | <50ms | <200 | <25MB |
| 50,000 | <2s | <50ms | <200 | <50MB |
| 100,000 | <3s | <50ms | <200 | <100MB |

**Key insight**: Render time and DOM nodes remain CONSTANT regardless of dataset size. Only initial data fetch scales (and is mitigated by pagination).

## Monitoring

- `PerformanceObserver` for LCP, FID, CLS
- Custom metric: `table-interactive-time` (time from mount to rows visible)
- Log when budget exceeded (console.warn in dev, analytics in prod)
