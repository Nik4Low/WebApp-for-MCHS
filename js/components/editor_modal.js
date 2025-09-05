// editor_modal.js
// Компонент модального окна для редактирования узлов и связей графа.
// Позволяет отображать форму с динамическими полями, предпросмотр и кнопки управления.

const EditorModal = {
  template: `
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="node-editor-modal">
        <div class="modal-header">
          <div class="modal-title">{{ title }}</div>
          <button class="modal-close" @click="close">&times;</button>
        </div>
        
        <!-- Вкладки -->
        <div class="modal-tabs">
          <button 
            v-for="(tab, index) in tabs" 
            :key="index"
            @click="activeTab = index"
            :class="{ active: activeTab === index }"
          >
            {{ tab.label }}
          </button>
        </div>
        
        <div class="preview-container" v-if="previewHtml" v-html="previewHtml"></div>
        
        <div class="modal-form">
          <!-- Показываем только поля активной вкладки -->
          <component 
            v-for="(item, index) in activeTabItems" 
            :key="index"
            :is="getComponentTag(item.component)"
            :label="item.props.label"
            :value="formData[item.key]"
            :options="item.props.options"
            :placeholder="item.props.placeholder"
            :min="item.props.min"
            :max="item.props.max"
            :step="item.props.step"
            @update="value => handleUpdate(item.key, value)"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="close">
            Отмена
          </button>
          <button class="btn btn-primary" @click="save">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  `,
  // Пропсы компонента:
  props: {
    visible: Boolean,
    title: String,
    formItems: Array,
    initialFormData: Object,
    previewFunction: Function
  },
  data() {
    return {
      formData: { ...this.initialFormData },
      previewHtml: '',
      activeTab: 0, // Активная вкладка по умолчанию
      tabs: [
        { label: 'Основные', key: 'main' },
        { label: 'Стили', key: 'styles' },
        { label: 'Текст', key: 'text' }
      ]
    };
  },
  computed: {
    // Фильтруем поля по активной вкладке
    activeTabItems() {
      if (!this.formItems) return [];
      
      return this.formItems.filter(item => {
        if (item.tab === undefined) return true;
        return item.tab === this.tabs[this.activeTab].key;
      });
    }
  },
  methods: {
    getComponentTag(componentName) {
      return componentName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    },
    handleUpdate(key, value) {
      this.formData[key] = value;
      this.updatePreview();
    },
    updatePreview() {
      if (this.previewFunction) {
        this.previewHtml = this.previewFunction(this.formData);
      }
    },
    save() {
      this.$emit('save', this.formData);
    },
    close() {
      this.$emit('close');
    }
  },
  watch: {
    initialFormData: {
      handler(newVal) {
        this.formData = { ...newVal };
        this.updatePreview();
      },
      immediate: true
    }
  },
  // Дочерние компоненты для разных типов полей формы
  components: {
    // Текстовое поле
    TextField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <input
            type="text"
            class="form-control"
            :value="value"
            @input="$emit('update', $event.target.value)"
            :placeholder="placeholder"
          />
        </div>
      `,
      props: ['label', 'value', 'placeholder']
    },
    // Выбор формы (круг/прямоугольник)
    ShapeField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="shape-picker">
            <div 
              v-for="option in options" 
              :key="option.value"
              class="shape-option"
              :class="{ selected: value === option.value }"
              @click="$emit('update', option.value)"
            >
              <svg width="24" height="24">
                <circle v-if="option.value === 'circle'" cx="12" cy="12" r="10" fill="#ccc" />
                <rect v-else-if="option.value === 'rect'" x="2" y="2" width="20" height="20" rx="7" fill="#ccc" />
              </svg>
            </div>
          </div>
        </div>
      `,
      props: ['label', 'value', 'options']
    },
    // Выбор иконки (FontAwesome)
    IconField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="icon-grid">
            <div 
              v-for="iconObj in options" 
              :key="iconObj.value"
              class="icon-option"
              :class="{ selected: value === iconObj.value }"
              @click="$emit('update', iconObj.value)"
            >
              <div class="icon-wrapper">
                <i :class="iconObj.value"></i>
              </div>
              <div v-if="iconObj.label" class="icon-label">{{ iconObj.label }}</div>
            </div>
          </div>
        </div>
      `,
      props: ['label', 'value', 'options'],
    },
    // Чекбокс
    CheckboxField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="checkbox-option">
            <input 
              type="checkbox" 
              :checked="value"
              @change="$emit('update', $event.target.checked)"
            />
          </div>
        </div>
      `,
      props: ['label', 'value']
    },
    // Слайдер/диапазон
    RangeField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="range-option">
            <input 
              type="range" 
              :min="min" 
              :max="max" 
              :step="step"
              :value="value"
              @input="$emit('update', parseInt($event.target.value))"
            />
            <span>{{ value || min }}</span>
          </div>
        </div>
      `,
      props: ['label', 'value', 'min', 'max', 'step']
    },
    // Числовое поле
    NumberField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <input
            type="number"
            class="form-control"
            :value="value"
            @input="$emit('update', parseInt($event.target.value))"
            :min="min"
            :max="max"
            :step="step"
          />
        </div>
      `,
      props: ['label', 'value', 'min', 'max', 'step']
    },
    // Цветовое поле (input + color picker)
    ColorField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="color-input-wrapper">
            <input
              type="text"
              class="form-control"
              :value="value || ''"
              @input="handleInput($event)"
              placeholder="#RRGGBB"
            />
            <input
              type="color"
              class="color-picker"
              :value="value || '#000000'"
              @input="$emit('update', $event.target.value)"
            />
          </div>
          <div class="color-picker" v-if="options && options.length">
            <div 
              v-for="color in options" 
              :key="color"
              class="color-option"
              :class="{ selected: value === color }"
              :style="{ backgroundColor: color }"
              @click="$emit('update', color)"
            ></div>
          </div>
        </div>
      `,
      props: ['label', 'value', 'options'],
      methods: {
        // Обработка ручного ввода цвета
        handleInput(event) {
          let value = event.target.value;
          
          // Если значение пустое, не эмитим событие
          if (!value || value.trim() === '') {
            return;
          }
          
          // Добавляем # если его нет
          if (value && !value.startsWith('#')) {
            value = '#' + value;
          }
          
          // Проверяем, что цвет соответствует формату #rrggbb
          const colorRegex = /^#[0-9A-Fa-f]{6}$/;
          if (colorRegex.test(value)) {
            this.$emit('update', value);
          }
        }
      }
    },
    // Выпадающий список
    SelectField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <select 
            class="form-control"
            :value="value"
            @change="$emit('update', $event.target.value)"
          >
            <option v-for="option in options" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      `,
      props: ['label', 'value', 'options']
    },
    // Выбор шрифта
    FontField: {
      template: `
        <div class="form-group">
          <label>{{ label }}</label>
          <div class="font-selector">
            <select 
              class="form-control"
              :value="value"
              @change="$emit('update', $event.target.value)"
            >
              <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <div class="font-preview" :style="{ fontFamily: value }">
              {{ previewText }}
            </div>
          </div>
        </div>
      `,
      props: ['label', 'value', 'options'],
      data() {
        return {
          previewText: 'AaBbCcDd 123'
        };
      }
    },
    // Разделитель
    DividerField: {
      template: `
        <div class="form-divider">
          <hr>
          <span class="divider-label">{{ label }}</span>
        </div>
      `,
      props: ['label']
    }
  }
};

// Глобальная регистрация компонента для доступа из main.js
if (typeof window !== 'undefined') {
  window.EditorModal = EditorModal;
}