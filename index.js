// app/page.js
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const experts = [
  {
    name: "Анна Вандаева",
    img: "/experts/Анна.png",
    url: "/experts/anna"
  },
  {
    name: "Ксения Дементьева",
    img: "/experts/Ксения.png",
    url: "/experts/ksu"
  },
  {
    name: "Дарья Михайлова",
    img: "/experts/Дарья.png",
    url: "/experts/daria"
  },
  {
    name: "Ольга Симич",
    img: "/experts/Ольга.png",
    url: "/experts/olga"
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center">
      
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 flex flex-col gap-6">
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Генератор психологических <span className="text-indigo-600">заключений</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Создавайте профессиональные заключения за считанные минуты. Автоматизация, удобные шаблоны и экспорт в DOCX.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link href="/generator" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg text-lg transition duration-300 shadow-md hover:shadow-lg">
                Попробовать генератор
              </Link>
            </motion.div>
          </div>
          <motion.div 
            className="md:w-1/2 flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Placeholder for a hero image or illustration */}
            <div className="bg-gray-100 border-2 border-dashed rounded-2xl w-full h-80 md:h-96 flex items-center justify-center">
              <span className="text-gray-400">Интерфейс генератора</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Почему выбирают наш генератор
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: "Быстро", desc: "Создавайте заключения за 2-3 минуты", icon: "⚡" },
              { title: "Удобно", desc: "Интуитивный интерфейс и гибкие шаблоны", icon: "👍" },
              { title: "Профессионально", desc: "Автоматическая интерпретация и фирменный стиль", icon: "💼" },
              { title: "Универсально", desc: "Поддержка различных методик", icon: "🌐" },
            ].map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Detailed Sections */}
      <section className="w-full py-16 px-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-24">
          {/* Generator Block */}
          <motion.div 
            className="flex flex-col md:flex-row items-center gap-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="md:w-1/2 order-2 md:order-1">
              <div className="bg-gray-100 border-2 border-dashed rounded-2xl w-full h-80 flex items-center justify-center">
                <span className="text-gray-400">Скриншот генератора</span>
              </div>
            </div>
            <div className="md:w-1/2 flex flex-col gap-4 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Генератор заключений
              </h2>
              <p className="text-lg text-gray-600">
                Уникальная автоматизация, гибкие шаблоны и фирменное оформление — всё, чтобы профессионалы могли тратить время на главное.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Быстро, просто, результат в формате DOCX</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Поддержка всех популярных методик</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Автоматическая интерпретация тестов</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Фирменный стиль, предпросмотр, рекомендации</span>
                </li>
              </ul>
              <Link href="/generator" className="inline-block text-indigo-600 hover:text-indigo-800 font-semibold mt-2">
                Попробовать генератор →
              </Link>
            </div>
          </motion.div>
          {/* Neuro Block */}
          <motion.div 
            className="flex flex-col md:flex-row items-center gap-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="md:w-1/2">
              <div className="bg-gray-100 border-2 border-dashed rounded-2xl w-full h-80 flex items-center justify-center">
                <span className="text-gray-400">Скриншот нейро-заключения</span>
              </div>
            </div>
            <div className="md:w-1/2 flex flex-col gap-4">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                Нейропсихологическое заключение
              </h2>
              <p className="text-lg text-gray-600">
                Современный инструментарий для комплексной диагностики. Включает автоматическую интерпретацию тестов, описание сильных сторон и актуальных трудностей.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Поддержка нейропсихологических методик</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Быстрое формирование итогового документа</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Гибкая настройка под любой случай</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-1">✓</span>
                  <span>Удобный предпросмотр и экспорт</span>
                </li>
              </ul>
              <Link href="/podrobneeozaklicheniyah" className="inline-block text-indigo-600 hover:text-indigo-800 font-semibold mt-2">
                Подробнее о заключениях →
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Тарифные планы
          </motion.h2>
          <motion.p 
            className="text-center text-gray-600 mb-12 text-lg"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Выберите план, который подходит именно вам
          </motion.p>
          <div className="flex flex-col md:flex-row gap-8">
            {/* LITE */}
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Lite</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">2 990 ₽</span>
                <span className="text-gray-600"> / месяц</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Консультативное заключение</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Генерация без ограничений</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Экспорт в DOCX</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <span>✕</span>
                  <span>Приоритетная поддержка</span>
                </li>
                <li className="flex items-center gap-2 text-gray-400">
                  <span>✕</span>
                  <span>Будущие обновления</span>
                </li>
              </ul>
              <button className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition">
                Выбрать Lite
              </button>
            </motion.div>
            {/* PRO */}
            <motion.div 
              className="flex-1 bg-white rounded-xl shadow-md border-2 border-indigo-500 p-8 relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                ПОПУЛЯРНЫЙ
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Pro</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">5 490 ₽</span>
                <span className="text-gray-600"> / месяц</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Все типы заключений</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Нейро, консультативное</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>DOCX, PDF, брендинг</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Приоритетная поддержка</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✅</span>
                  <span>Будущие обновления</span>
                </li>
              </ul>
              <button className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition">
                Выбрать Pro
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Experts Section */}
      <section className="w-full py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Наши эксперты
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {experts.map(({ name, img, url }, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-white shadow-md">
                  <img
                    src={img}
                    alt={name}
                    className="object-cover w-full h-full"
                    draggable={false}
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
                <Link href={url} className="text-indigo-600 hover:text-indigo-800 text-sm mt-1">
                  Подробнее
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}