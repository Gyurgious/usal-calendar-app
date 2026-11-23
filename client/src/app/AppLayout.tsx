import { Badge, Button, Container, Nav, Navbar } from 'react-bootstrap'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../features/auth/AuthContext'

/** Navbar + page content for every signed-in page. */
export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <>
      <Navbar bg="dark" data-bs-theme="dark" expand="md" className="mb-4">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            USAL Calendar
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
           <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/" end>
                Calendar
              </Nav.Link>
              {user?.isApprover && (
                <>
                  <Nav.Link as={NavLink} to="/approvals">
                    Approvals
                  </Nav.Link>
                  <Nav.Link as={NavLink} to="/events">
                    Events
                  </Nav.Link>
                </>
              )}
            </Nav>
            <Navbar.Text className="me-3">
              {user?.displayName}{' '}
              {user?.isApprover && (
                <Badge bg="info" text="dark">
                  Approver
                </Badge>
              )}
            </Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container>
        <Outlet />
      </Container>
    </>
  )
}
