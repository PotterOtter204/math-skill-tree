# React-Konva Canvas Features

This project includes advanced canvas functionality using react-konva with zoom, pan, and interactive custom components.

## Components

### 1. KonvaWrapper (`app/components/konvaWrapper.jsx`)
Basic canvas with zoom and pan functionality.

**Features:**
- Mouse wheel zoom with pointer-relative scaling
- Drag to pan the canvas
- Add random shapes (rectangles and arrows)
- Interactive nodes with hover effects and click tracking
- Real-time zoom and position display
- Reset view button

**Controls:**
- **Mouse Wheel**: Zoom in/out relative to cursor position
- **Click + Drag**: Pan the canvas
- **Click Shapes**: Interact with shapes and track clicks

### 2. EnhancedKonvaWrapper (`app/components/EnhancedKonvaWrapper.jsx`)
Advanced canvas with custom components and connection system.

**Features:**
- All features from basic wrapper
- Custom node types: Circle, Square, Star
- Draggable nodes with visual feedback
- Node selection system
- Connect nodes with arrows
- Delete selected nodes
- Click counters on nodes
- Hover effects with scaling and glow

**Controls:**
- **Mouse Wheel**: Zoom in/out
- **Drag Background**: Pan the canvas
- **Drag Nodes**: Move nodes around
- **Click Node**: Select node
- **Connect Nodes**: Select a node, click "Connect Nodes", then click target node

### 3. InteractiveNode (`app/components/InteractiveNode.jsx`)
Reusable custom JSX component for creating interactive nodes.

**Props:**
- `id`: Unique identifier
- `x, y`: Position
- `radius`: Size of the node
- `color`: Fill color
- `text`: Label text
- `type`: 'circle', 'square', or 'star'
- `hovered`: Hover state
- `selected`: Selection state
- `clicks`: Number of clicks
- `draggable`: Enable/disable dragging
- Event handlers: `onNodeClick`, `onNodeHover`, `onNodeDragStart`, `onNodeDragEnd`

## Implementation Details

### Zoom Implementation

The zoom functionality uses the following approach:

```javascript
const handleWheel = (e) => {
  e.evt.preventDefault();

  const stage = stageRef.current;
  const oldScale = stage.scaleX();
  const pointer = stage.getPointerPosition();

  // Calculate mouse position relative to the stage
  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };

  // Determine zoom direction
  const direction = e.evt.deltaY > 0 ? -1 : 1;

  // Calculate new scale with limits
  let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
  newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

  // Calculate new position to zoom relative to pointer
  const newPos = {
    x: pointer.x - mousePointTo.x * newScale,
    y: pointer.y - mousePointTo.y * newScale,
  };

  setStageScale(newScale);
  setStagePosition(newPos);
};
```

**Key concepts:**
- `SCALE_BY = 1.02`: Controls zoom speed (smaller = smoother)
- Zoom is relative to pointer position, not center
- Min/max scale limits prevent excessive zoom
- Position calculation keeps the point under the cursor stationary

### Pan Implementation

Panning is enabled by making the Stage draggable:

```javascript
<Stage
  draggable
  onDragEnd={(e) => {
    setStagePosition({
      x: e.target.x(),
      y: e.target.y(),
    });
  }}
/>
```

### Custom Components

Custom components in react-konva are created by composing Konva shapes:

```javascript
<Group x={x} y={y} draggable>
  <Circle radius={radius} fill={color} />
  <Text text={label} />
</Group>
```

**Benefits:**
- Reusable component logic
- Easier state management
- Cleaner code organization
- Type safety with PropTypes/TypeScript

## Usage

### Switch to Enhanced Version

To use the enhanced wrapper, update `app/page.js`:

```javascript
const KonvaWrapper = dynamic(
  async () => (await import("./components/EnhancedKonvaWrapper")).default,
  { ssr: false }
);
```

### Create Custom Interactive Components

Example of creating a custom component:

```javascript
import { Group, Circle, Text } from 'react-konva';

const MyCustomNode = ({ x, y, label, onClick }) => (
  <Group x={x} y={y} onClick={onClick}>
    <Circle radius={50} fill="blue" />
    <Text text={label} fill="white" />
  </Group>
);
```

## Configuration

### Zoom Settings

```javascript
const SCALE_BY = 1.02;  // Zoom increment (1.01-1.05 recommended)
const MIN_SCALE = 0.1;  // Minimum zoom out
const MAX_SCALE = 5;    // Maximum zoom in
```

### Canvas Size

The canvas automatically sizes to the window:

```javascript
width={window.innerWidth - 40}
height={window.innerHeight - 150}
```

Adjust these values based on your layout needs.

## Performance Tips

1. **Use `perfectDrawEnabled={false}`** on shapes for better drag performance
2. **Limit shadow effects** on many shapes
3. **Use `listening={false}`** on decorative shapes that don't need interaction
4. **Consider virtualization** for very large node counts (>1000)
5. **Use `Layer` wisely** - separate static and dynamic content

## Examples from Documentation

Based on react-konva documentation research:

- **Zoom relative to pointer**: Konva docs provide examples at konvajs.org/docs/sandbox/Zooming_Relative_To_Pointer.html
- **Canvas scrolling**: Examples at konvajs.org/docs/sandbox/Canvas_Scrolling.html
- **Multi-touch**: Mobile examples at konvajs.org/docs/sandbox/Multi-touch_Scale_Stage.html

## Resources

- Official Konva docs: https://konvajs.org/
- React-Konva docs: https://konvajs.org/docs/react/
- GitHub: https://github.com/konvajs/react-konva
