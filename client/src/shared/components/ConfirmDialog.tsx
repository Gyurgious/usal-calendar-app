import type { ReactNode } from 'react'
import { Button, Modal } from 'react-bootstrap'

interface ConfirmDialogProps {
  title: string
  children: ReactNode
  confirmLabel: string
  isWorking?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** "Are you sure?" dialog for destructive actions (delete, withdraw). Render it only while needed. */
export function ConfirmDialog({ title, children, confirmLabel, isWorking = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal show onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={isWorking}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isWorking}>
          {isWorking ? 'Working…' : confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}