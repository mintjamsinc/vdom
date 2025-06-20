# 📦 vdom.js

**vdom.js** is a lightweight virtual DOM library that enables reactive state management and dynamic rendering directly within HTML using intuitive template syntax. You can build interactive UIs without complex setup.

## ✨ Features

* Conditional rendering: `v-if`, `v-else-if`, `v-else`
* List rendering with `v-for`, including multi-variable and index support + `:key`
* Two-way data binding with `v-model` and modifiers like `.number`, `.boolean`, `.date`, etc.
* Event handling via `@click`, `@keyup.enter`, `.stop`, `.prevent`, and more
* Dynamic attribute, class, and style bindings: `:class`, `:style`, `:title`, etc.
* Component system: separate template and logic for reusability
* App instance logic: `data`, `methods`, `computed`
* Lifecycle hooks: `@bind`, `@bound`, `@unbind`, `@unbound`

## 🚀 Getting Started

### HTML Template Example

```html
<div id="app">
  <p>{{ message }}</p>
  <button @click="greet">Greet</button>

  <ul>
    <li v-for="item of items" :key="item">{{ item }}</li>
  </ul>
</div>
```

### JavaScript Setup

```javascript
import { VDOM } from '../dist/vdom.js';

VDOM.createApp('#app', {
  data() {
    return {
      message: 'Hello, vdom.js!',
      items: [1, 2, 3]
    };
  },
  methods: {
    greet() {
      alert(this.message);
    }
  }
});
```

## 🧩 Defining Components

```javascript
VDOM.addComponent({
  id: 'my-button',
  templateID: 'my-button-template',
  createInstance(props) {
    return {
      data() {
        return { count: 0 };
      },
      methods: {
        increment() {
          this.count++;
        }
      }
    };
  }
});
```

```html
<template id="my-button-template">
  <button @click="increment">Clicked {{ count }} times</button>
</template>

<div v-component="my-button"></div>
```

## 🔧 Supported Directives and Syntax

| Directive / Syntax              | Description                       |
| ------------------------------- | --------------------------------- |
| `v-if`, `v-else-if`, `v-else`   | Conditional rendering             |
| `v-for="item of list"`          | List rendering with index support |
| `:key="item.id"`                | Unique key for efficient updates  |
| `v-model="value"`               | Two-way data binding              |
| `.number`, `.boolean`, etc.     | Modifiers for `v-model`           |
| `@click="method"`               | Event handling                    |
| `:class="{ active: isActive }"` | Dynamic class binding             |
| `:style="{ color: 'red' }"`     | Dynamic style binding             |
| `v-component="compId"`          | Component instantiation           |
| `v-template="tmplId"`           | Dynamic template switching        |

## 🔨 Build

Run `npm install` and `npm run build` to compile the TypeScript source using
`tsc` and generate `dist/vdom.js`. A minified bundle is also produced via
`esbuild` at `dist/vdom.min.js`.

## 📜 License

MIT License
