(module
 (type $0 (func (param i32 i32) (result i32)))
 (type $1 (func (param i32 i32 i32 i32 i32 i32)))
 (memory $0 0)
 (export "resizeImageBilinear" (func $assembly/image-resize/resizeImageBilinear))
 (export "memory" (memory $0))
 (func $assembly/image-resize/min (param $0 i32) (param $1 i32) (result i32)
  local.get $0
  local.get $1
  local.get $0
  local.get $1
  i32.lt_s
  select
 )
 (func $assembly/image-resize/resizeImageBilinear (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 f32)
  (local $9 i32)
  (local $10 f32)
  (local $11 i32)
  (local $12 f32)
  (local $13 f32)
  (local $14 i32)
  (local $15 i32)
  (local $16 i32)
  (local $17 i32)
  (local $18 f32)
  local.get $0
  f32.convert_i32_s
  local.get $2
  f32.convert_i32_s
  f32.div
  local.set $8
  local.get $1
  f32.convert_i32_s
  local.get $3
  f32.convert_i32_s
  f32.div
  local.set $10
  loop $for-loop|0
   local.get $3
   local.get $9
   i32.gt_s
   if
    i32.const 0
    local.set $7
    loop $for-loop|1
     local.get $2
     local.get $7
     i32.gt_s
     if
      local.get $7
      f32.convert_i32_s
      local.get $8
      f32.mul
      local.tee $12
      i32.trunc_sat_f32_s
      local.set $6
      local.get $9
      f32.convert_i32_s
      local.get $10
      f32.mul
      local.tee $13
      i32.trunc_sat_f32_s
      local.set $14
      local.get $12
      local.get $6
      f32.convert_i32_s
      f32.sub
      local.set $12
      local.get $13
      local.get $14
      f32.convert_i32_s
      f32.sub
      local.set $13
      local.get $4
      local.get $0
      local.get $14
      i32.mul
      local.tee $15
      local.get $6
      i32.add
      i32.const 2
      i32.shl
      i32.add
      local.set $11
      local.get $4
      local.get $6
      i32.const 1
      i32.add
      local.get $0
      i32.const 1
      i32.sub
      call $assembly/image-resize/min
      local.tee $16
      local.get $15
      i32.add
      i32.const 2
      i32.shl
      i32.add
      local.set $15
      local.get $4
      local.get $14
      i32.const 1
      i32.add
      local.get $1
      i32.const 1
      i32.sub
      call $assembly/image-resize/min
      local.get $0
      i32.mul
      local.tee $14
      local.get $6
      i32.add
      i32.const 2
      i32.shl
      i32.add
      local.set $17
      local.get $4
      local.get $14
      local.get $16
      i32.add
      i32.const 2
      i32.shl
      i32.add
      local.set $14
      local.get $5
      local.get $2
      local.get $9
      i32.mul
      local.get $7
      i32.add
      i32.const 2
      i32.shl
      i32.add
      local.set $16
      i32.const 0
      local.set $6
      loop $for-loop|2
       local.get $6
       i32.const 4
       i32.lt_s
       if
        local.get $6
        local.get $16
        i32.add
        local.get $6
        local.get $11
        i32.add
        i32.load8_u
        f32.convert_i32_u
        f32.const 1
        local.get $12
        f32.sub
        local.tee $18
        f32.mul
        local.get $6
        local.get $15
        i32.add
        i32.load8_u
        f32.convert_i32_u
        local.get $12
        f32.mul
        f32.add
        f32.const 1
        local.get $13
        f32.sub
        f32.mul
        local.get $6
        local.get $17
        i32.add
        i32.load8_u
        f32.convert_i32_u
        local.get $18
        f32.mul
        local.get $6
        local.get $14
        i32.add
        i32.load8_u
        f32.convert_i32_u
        local.get $12
        f32.mul
        f32.add
        local.get $13
        f32.mul
        f32.add
        i32.trunc_sat_f32_u
        i32.store8
        local.get $6
        i32.const 1
        i32.add
        local.set $6
        br $for-loop|2
       end
      end
      local.get $7
      i32.const 1
      i32.add
      local.set $7
      br $for-loop|1
     end
    end
    local.get $9
    i32.const 1
    i32.add
    local.set $9
    br $for-loop|0
   end
  end
 )
)
