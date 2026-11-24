import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, deleteUser, getUsers, updateUser, type UserRequest } from './usersApi'

const usersKey = ['users'] as const

/** The users list (approvers only). */
export function useUsers() {
  return useQuery({ queryKey: usersKey, queryFn: getUsers })
}

/** A mutation that refreshes the users list when it succeeds. */
function useUserMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKey }) })
}

export const useCreateUser = () => useUserMutation(createUser)
export const useUpdateUser = () =>
  useUserMutation(({ id, request }: { id: number; request: UserRequest }) => updateUser(id, request))
export const useDeleteUser = () => useUserMutation(deleteUser)