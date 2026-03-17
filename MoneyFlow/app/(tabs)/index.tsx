import { useState, useEffect } from 'react'; 
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TextInput, FlatList, TouchableOpacity } from 'react-native'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Picker } from '@react-native-picker/picker';

export default function App() {
  
  const [total, setTotal] = useState(0);
  const [cantidad, setCantidad] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Comida'); 
  
  // Le decimos a TypeScript que este es un arreglo que puede contener cualquier cosa (any)
  const [gastos, setGastos] = useState<any[]>([]);

  useEffect(() => {
    cargarDatos(); 
  }, []); 

  const cargarDatos = async () => {
    try {
      const gastosGuardados = await AsyncStorage.getItem('mis_gastos');
      if (gastosGuardados !== null) {
        const listaTraducida = JSON.parse(gastosGuardados);
        setGastos(listaTraducida); 
        
        let totalCalculado = 0;
        listaTraducida.forEach((gasto: any) => totalCalculado = totalCalculado + gasto.monto);
        setTotal(totalCalculado); 
      }
    } catch (error) {
      console.log('Error al cargar datos:', error);
    }
  };

  const guardarDatos = async (nuevaListaDeGastos: any) => {
    try {
      const textoGuardar = JSON.stringify(nuevaListaDeGastos);
      await AsyncStorage.setItem('mis_gastos', textoGuardar);
    } catch (error) {
      console.log('Error al guardar datos:', error);
    }
  };

  const agregarGasto = () => {
    const numero = parseFloat(cantidad);
    if (numero > 0 && descripcion !== '') {
      const nuevoGasto = {
        id: Date.now().toString(), 
        nombre: descripcion,
        monto: numero,
        categoria: categoria 
      };
      
      const nuevaLista = [...gastos, nuevoGasto];
      setGastos(nuevaLista); 
      setTotal(total + numero); 
      setCantidad(''); 
      setDescripcion('');
      guardarDatos(nuevaLista);
    } else {
      alert('Por favor, ingresa una cantidad válida y una descripción.'); 
    }
  };

  const eliminarGasto = (idParaBorrar: string) => {
    const gastoEncontrado = gastos.find((gasto) => gasto.id === idParaBorrar);
    const listaFiltrada = gastos.filter((gasto) => gasto.id !== idParaBorrar);
    
    setGastos(listaFiltrada); 
    setTotal(total - gastoEncontrado.monto); 
    guardarDatos(listaFiltrada);
  };

  const reiniciarTodo = () => {
    setTotal(0);
    setGastos([]); 
    guardarDatos([]);
  };

  // ¡NUEVA LÓGICA! Calculamos cuánto hemos gastado por categoría
  const resumenCategorias = gastos.reduce((acumulador, gasto) => {
    const cat = gasto.categoria;
    // Si la categoría aún no existe en nuestro resumen, la creamos en 0
    if (!acumulador[cat]) {
      acumulador[cat] = 0;
    }
    // Le sumamos el monto del gasto actual
    acumulador[cat] += gasto.monto;
    return acumulador;
  }, {});

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a MoneyFlow! 💸</Text>
      <Text style={styles.monto}>Total gastado hoy: ${total}</Text>

      {/* ¡NUEVO! Cajita visual para mostrar el resumen por categorías */}
      {gastos.length > 0 && (
        <View style={styles.resumenContainer}>
          <Text style={styles.resumenTitulo}>Resumen por categoría:</Text>
          <View style={styles.resumenGrid}>
            {Object.keys(resumenCategorias).map((cat) => (
              <View key={cat} style={styles.resumenItem}>
                <Text style={styles.resumenCatNombre}>{cat}</Text>
                <Text style={styles.resumenCatMonto}>${resumenCategorias[cat]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      
      <View style={styles.formulario}>
        <TextInput 
          style={styles.input} 
          placeholder="¿En qué gastaste?" 
          value={descripcion} 
          onChangeText={(texto) => setDescripcion(texto)} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="¿Cuánto costó?" 
          keyboardType="numeric" 
          value={cantidad} 
          onChangeText={(texto) => setCantidad(texto)} 
        />

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoria}
            onValueChange={(valorSeleccionado) => setCategoria(valorSeleccionado)}
          >
            <Picker.Item label="🍔 Comida" value="Comida" />
            <Picker.Item label="🚗 Transporte" value="Transporte" />
            <Picker.Item label="🏠 Hogar" value="Hogar" />
            <Picker.Item label="🎬 Ocio" value="Ocio" />
            <Picker.Item label="📦 Otros" value="Otros" />
          </Picker>
        </View>

        <View style={styles.botones}>
          <Button title="Agregar gasto" onPress={agregarGasto} />
          <Button title="Reiniciar" onPress={reiniciarTodo} color="#e74c3c" />
        </View>
      </View>

      <Text style={styles.subtitulo}>Historial:</Text>
      
      <FlatList 
        data={gastos} 
        keyExtractor={(item) => item.id} 
        renderItem={({ item }) => ( 
          <View style={styles.itemGasto}>
            <View style={styles.infoGasto}>
              <Text style={styles.itemTexto}>{item.nombre}</Text>
              <Text style={styles.itemCategoria}>{item.categoria}</Text>
            </View>
            <View style={styles.accionesGasto}>
              <Text style={styles.itemPrecio}>${item.monto}</Text>
              <TouchableOpacity style={styles.botonBorrar} onPress={() => eliminarGasto(item.id)}>
                <Text style={styles.textoBorrar}>X</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 60, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#333' },
  monto: { fontSize: 22, marginBottom: 15, color: '#27ae60', fontWeight: 'bold', textAlign: 'center' },
  
  // Estilos del nuevo resumen
  resumenContainer: { backgroundColor: '#e8f4f8', padding: 15, borderRadius: 10, marginBottom: 20 },
  resumenTitulo: { fontWeight: 'bold', color: '#2c3e50', marginBottom: 10, textAlign: 'center' },
  resumenGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  resumenItem: { backgroundColor: 'white', padding: 8, borderRadius: 8, minWidth: '45%', alignItems: 'center' },
  resumenCatNombre: { fontSize: 12, color: '#7f8c8d' },
  resumenCatMonto: { fontSize: 16, fontWeight: 'bold', color: '#2980b9' },

  formulario: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', justifyContent: 'center' },
  botones: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 5 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#555' },
  itemGasto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 8, borderLeftWidth: 5, borderLeftColor: '#2980b9' },
  infoGasto: { flex: 1 },
  itemTexto: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  itemCategoria: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  accionesGasto: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  itemPrecio: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
  botonBorrar: { backgroundColor: '#ffeeee', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  textoBorrar: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});