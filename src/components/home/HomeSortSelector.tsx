import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import {
  FormControl,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material'
import type { ListNotebooksSortBy } from '@/types/api'

interface HomeSortSelectorProps {
  value: ListNotebooksSortBy
  onChange: (value: ListNotebooksSortBy) => void
}

export function HomeSortSelector({ value, onChange }: HomeSortSelectorProps) {
  const handleSortByChange = (event: SelectChangeEvent<ListNotebooksSortBy>) => {
    onChange(event.target.value as ListNotebooksSortBy)
  }

  return (
    <FormControl size="small" sx={{ minWidth: 84 }}>
      <Select
        value={value}
        onChange={handleSortByChange}
        IconComponent={KeyboardArrowDownRoundedIcon}
        sx={{
          height: 30,
          borderRadius: 1,
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 'unset',
            boxSizing: 'border-box',
            py: 0,
            pl: 1,
            pr: '22px !important',
            fontSize: 12,
            lineHeight: 1,
            fontWeight: 500,
            textAlign: 'center',
          },
          '& .MuiSelect-icon': {
            fontSize: 16,
            right: 4,
            top: 'calc(50% - 8px)',
          },
        }}
        aria-label="笔记本排序方式"
      >
        <MenuItem value="last_active" sx={{ fontSize: 12 }}>
          最近活跃
        </MenuItem>
        <MenuItem value="create_time" sx={{ fontSize: 12 }}>
          创建时间
        </MenuItem>
      </Select>
    </FormControl>
  )
}
