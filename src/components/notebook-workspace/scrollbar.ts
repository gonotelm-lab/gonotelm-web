export const subtleScrollbarSx = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',
  '&::-webkit-scrollbar': {
    width: 5,
    height: 5,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  '&:hover': {
    scrollbarColor: 'rgba(120, 120, 120, 0.16) transparent',
  },
  '&:hover::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(120, 120, 120, 0.16)',
  },
}
