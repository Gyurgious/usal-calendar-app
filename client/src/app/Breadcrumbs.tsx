import type { ReactNode } from 'react'
import { Breadcrumb } from 'react-bootstrap'
import { Link, useMatches, type Params, type UIMatch } from 'react-router'

/** What a route puts in its `handle` to appear in the breadcrumb bar (see router.tsx). */
export interface RouteHandle {
  /** Plain text, or built from the URL, e.g. an event's title from its id. */
  crumb: string | ((params: Params) => ReactNode)
}

const hasCrumb = (match: UIMatch): match is UIMatch<unknown, RouteHandle> =>
  typeof match.handle === 'object' && match.handle !== null && 'crumb' in match.handle

export function Breadcrumbs() {
  const crumbs = useMatches().filter(hasCrumb)

  return (
    <Breadcrumb label="Breadcrumb" className="breadcrumbs">
      <Breadcrumb.Item linkAs={Link} linkProps={{ to: '/' }}>
        Home
      </Breadcrumb.Item>
      {crumbs.map((match, index) => {
        const { crumb } = match.handle
        return (
          <Breadcrumb.Item
            key={match.id}
            active={index === crumbs.length - 1}
            linkAs={Link}
            linkProps={{ to: match.pathname }}
          >
            {typeof crumb === 'function' ? crumb(match.params) : crumb}
          </Breadcrumb.Item>
        )
      })}
    </Breadcrumb>
  )
}
