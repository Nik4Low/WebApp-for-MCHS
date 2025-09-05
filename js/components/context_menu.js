// context_menu.js
// Компонент контекстного меню для работы с графом. Отображает список действий в зависимости от типа объекта (узел, связь, область).

const ContextMenu = {
  template: `
    <div 
      v-if="visible" 
      class="context-menu" 
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @click.stop
    >
      <!-- Перебор пунктов меню -->
      <template v-for="(item, index) in items">
        <div v-if="item.divider" :key="'divider-'+index" class="menu-divider"></div>
        <div 
          v-else
          :key="index"
          class="menu-item"
          :class="{ disabled: item.disabled }"
          @click="!item.disabled && item.action()"
        >
          {{ item.label }}
        </div>
      </template>
    </div>
  `,
  // Пропсы компонента:
  props: {
    visible: Boolean, // Видимость меню
    items: Array,     // Массив пунктов меню
    position: Object  // Позиция меню (x, y)
  }
};

// Глобальная регистрация компонента для доступа из main.js
if (typeof window !== 'undefined') {
  window.ContextMenu = ContextMenu;
}